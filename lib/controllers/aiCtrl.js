"use strict";

/**
 * Created by Samuel Truniger.
 *
 * Controller for hanlding request to chatGPT for hints/compiler-messages.
 */

const { OpenAIClient, AzureKeyCredential } = require("@azure/openai"),
  projectSrv = require("../services/projectSrv.js"),
  db = require("../models"),
  config = require("../config/config.js");

const key = config.gpt.openaiAPIKey;
const endpoint = config.gpt.endpoint;
const deploymentId = config.gpt.deploymentId;
const client = new OpenAIClient(endpoint, new AzureKeyCredential(key));

// function which makes a call to openai API to get the relevant hint for the student solution
var getRelevantHint = async function (req, res) {
  // extract the projectId from the route
  let _projectId = req.params.projectId;

  try {
    // find project and all corresponding files
    let project = await db.Project.findOne({
      where: { id: _projectId },
      attributes: ["id"],
      include: [
        {
          model: db.File,
          as: "fileSet",
          where: { ProjectId: _projectId },
          attributes: [
            "id",
            "filename",
            "path",
            "content",
            "isHidden",
            "isStatic",
            "ProjectId"
          ],
          required: false
        }
      ]
    });

    let userCodeContent = await projectSrv.getAllChangeableUserFiles(
      req.params.username,
      req.params.courseId,
      req.params.projectId
    );

    if (project === null) {
      res.status(404).json({ message: "The project does not exist." });
    } else if (!userCodeContent) {
      res
        .status(404)
        .json({ message: "The code of the user could not be loaded." });
    } else {
      // get sampleSolution.html and projectDescription.html content
      let solution = "No sample solution available";
      let desc = "No description available";
      let filteredFiles = project.fileSet.filter(
        (file) =>
          file.filename === "sampleSolution.html" ||
          file.filename === "projectDescription.html"
      );
      if (filteredFiles.length > 0) {
        filteredFiles.forEach((file) => {
          if (file.filename === "sampleSolution.html") {
            solution = file.content.replace(/(<([^>]+)>)/gi, "");
          }
          if (file.filename === "projectDescription.html") {
            desc = file.content.replace(/(<([^>]+)>)/gi, "");
          }
        });
      }

      // get staticFiles content if existing in projects
      let staticFiles = project.fileSet.filter((file) => file.isStatic);
      let staticFilesContent = "";
      if (staticFiles.length > 0) {
        staticFiles.forEach((file) => {
          staticFilesContent += file.content + "\n";
        });
      }

      // extract the available hints from the request body
      let hints = JSON.stringify(req.body.hints);

      const prompt = `
        **Task Description:**
        ${desc}

        **Student's Code:**
        ${userCodeContent}

        **Predefined Files:**
        ${staticFilesContent || "No predefined (unchangable) files in this task"}

        **Sample Solution:**
        ${solution}

        **Available Hints:**
        ${hints}

        Your role is to analyze the provided informations carefully to determine the most relevant hint id which helps the student complets his code.\
        Compare the student code to the sample solution and analyze whether any of the available hints directly address gaps or errors in the student's code.\
        In addition consider how predefined files (if available) complement the task,\
        If no hint is applicable, respond with -1. Focus on identifying the hint id that offers the most value.
        `;

      const messages = [
        // {
        //   role: "system",
        //   content:
        //     "Your role is to analyze the provided informations carefully to determine the most relevant hint id for completing the student's code. \
        //     Consider how predefined files complement the task, compare the student code to the sample solution and analyze whether any of the available hints directly address gaps or errors in the student's code. \
        //     If no hint is applicable, respond with -1. Focus on identifying the hint id that offers the most value."
        // },
        { role: "user", content: prompt }
      ];

      const events = await client.getChatCompletions(deploymentId, messages);

      const openAIResponse = events.choices[0].message.content;
      res.status(200).json(openAIResponse);
    }
  } catch (err) {
    console.log(err);
    res.status(500).json({
      message: "An error occurred while fetching the relevant hint using AI."
    });
  }
};

// function which makes a call to openai API to get an explanation for a compiler message (compilation error)
var getCompilerExplanation = async function (req, res) {
  let _errorMsg = req.body.outputArray;
  let _username = req.params.username;

  try {
    let userCodeContent = await projectSrv.getAllChangeableUserFiles(
      _username,
      req.params.courseId,
      req.params.projectId
    );

    const prompt = `
        **Error Message:**
        ${_errorMsg.join("\n")}

        **Username**
        ${_username}

        **Student's Code:**
        ${userCodeContent}

        Your role is to explain the error message in a maximum of 3 sentences in German. You can address me with the given username. Please always mention in which class the error occurs.\
        You can also provide hints how to solve the error. If there are multiple errors plase only explain 1 or 2 of them (due to consequential error).
        `;

    const messages = [
      // {
      //   role: "system",
      //   content: ""
      // },
      { role: "user", content: prompt }
    ];

    const events = await client.getChatCompletions(deploymentId, messages);

    const openAIResponse = events.choices[0].message.content;

    const response = {
      answer: openAIResponse,
      error: _errorMsg
    };

    res.status(200).json(response);
  } catch (err) {
    console.log(err);
    res.status(500).json({
      message:
        "An error occurred while fetching the explanation for the compiler-messages using AI."
    });
  }
};

module.exports = {
  getRelevantHint: getRelevantHint,
  getCompilerExplanation: getCompilerExplanation
};
