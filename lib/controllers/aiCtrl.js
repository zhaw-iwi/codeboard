"use strict";

/**
 * Created by Samuel Truniger.
 *
 * Controller for hanlding request to chatGPT for hints/compiler-messages.
 */

const projectSrv = require("../services/projectSrv.js"),
  AiSrv = require("../services/AISrv.js"),
  userSrv = require("../services/userSrv.js"),
  db = require("../models");

// function which makes a call to openai API to get the relevant hint for the student solution
var getRelevantHint = async function (req, res) {
  try {
    // extract the projectId from the route
    let _userId = req.params.userId;
    // if request cames without courseId > userCodeContent isn't available > send back 404
    let _courseId = req.params.courseId;
    let _projectId = req.params.projectId;

    // find project and all corresponding files
    const project = await db.Project.findOne({
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

    const userCodeContent = await projectSrv.getAllChangeableUserFiles(_userId, _courseId, _projectId);

    if (project === null) {
      return res.status(404).json({ message: "The project does not exist." });
    }

    if (!userCodeContent || userCodeContent.trim() === "") {
      return res.status(404).json({ message: "The user files could not get loaded." });
    }

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
      <task description>
        ${desc}
      </task description>

      <student code>
        ${userCodeContent}
      </student code>

      <predefined files>
        ${staticFilesContent || "No predefined (unchangable) files in this task"}
      </predefined files>

      <sample solution>
        ${solution}
      </sample solution>

      <available hints>
        ${hints}
      </available hints>

      Your role is to examine Java Code. Please analyze the provided information (delimited by XML tags) to determine the most relevant hint ID that helps the student complete his code.\
      Compare the student code to the sample solution and analyze whether any available hints directly address gaps or errors in the student's code.\
      In addition, consider how predefined files (files that can not be changed by students) complement the task.\
      If more than 1 hint is applicable identify the id of the most relevant one. If no hint is applicable, respond with -1.\
      Please make sure that you only respond with the id of the hint with no further information or characters (use Python to check if the id in your response is an Integer)
      `;

    const messages = [{ role: "system", content: prompt }];

    const dataAI = {
      msg: messages,
      usrId: _userId,
      crsId: _courseId,
      prjId: _projectId,
      tool: "hints"
    };

    const openAIResponse = await AiSrv.askForHelp(dataAI);
    res.status(200).json(openAIResponse);
    
  } catch (err) {
    console.log("Error during ai hint selection: ", { error: err.message });
    res.status(500).json({ message: "An error occurred while fetching the relevant hint using AI." });
  }
};

// function which makes a call to openai API to get an explanation for a compiler message (compilation error)
var getCompilerExplanation = async function (req, res) {
  try {
    let _errorMsg = req.body.outputArray;
    let _userId = req.params.userId;
    let _courseId = req.params.courseId;
    let _projectId = req.params.projectId;

    const user = await userSrv.getUserById(_userId);

    // if request cames without courseId > userCodeContent isn't available > send back 404
    const userCodeContent = await projectSrv.getAllChangeableUserFiles(_userId, _courseId, _projectId);

    if (!userCodeContent || userCodeContent.trim() === "") {
      return res.status(404).json({ message: "The user files could not get loaded." });
    }

    const prompt = `
        <error message>
          ${_errorMsg.join("\n")}
        </error message>

        <username>
          ${user.name}
        </username>

        <student code>
          ${userCodeContent}
        </student code>

        You are an AI-Assistant who explains compilation errors in Java in a maximum of 3 sentences in German. You can address the students with the given username.\
        Please always mention in which class the error occurs. You can also provide hints on how to solve the error.\
        If there are multiple compilation errors please only explain 1 or 2 of them (due to consequential errors).
        `;

    const messages = [{ role: "system", content: prompt }];

    const dataAI = {
      msg: messages,
      usrId: _userId,
      crsId: _courseId,
      prjId: _projectId,
      tool: "compErrExp"
    };

    const openAIResponse = await AiSrv.askForHelp(dataAI);

    const response = {
      answer: openAIResponse,
      error: _errorMsg
    };

    res.status(200).json(response);
  } catch (err) {
    console.log("Error during ai compiler explanation: ", { error: err.message });
    res.status(500).json({ message: "An error occurred while fetching the explanation for the compiler-messages using AI." });
  }
};

// function to get the usage stats of the GPT based helper systems
var getUsageStats = async function (req, res) {
  try {
    if (req.isAuthenticated() && (req.user.username === "admin" || req.user.username === "javakurs")) {
      const stats = await db.AIUsage.findAll({
        attributes: [
          "id",
          "promptTokens",
          "completionTokens",
          "totalTokens",
          "tool",
          "userId",
          "courseId",
          "projectId",
          "createdAt"
        ],
        // return plain json objects
        raw: true
      });

      // convert json data into csv
      if (stats && stats.length > 0) {
        // take property names of the first object
        const jsonKeys = Object.keys(stats[0]);
        
        // seperate headers by ","
        const headerRow = jsonKeys.join(",");
        const rowData = stats.map((item) => {
          return jsonKeys.map((key) => item[key]).join(",");
        });
        
        const json2CSV = `${headerRow}\n${rowData.join("\n")}`;
        
        // set headers to force the file download
        res.setHeader("Content-disposition", "attachment; filename=usage-stats.csv");
        res.set("Content-Type", "text/csv");
        return res.status(200).send(json2CSV);
      
      } else {
        return res.status(404).send("No stats available!");
      }
    } else {
      return res.status(403).send("Access denied.");
    }
  } catch (err) {
    console.error("Error fetching AI usage stats: ", { error: err.message } );
    res.status(500).json({ message: "An error occurred while fetching the AI usage stats." });
  }
};

module.exports = {
  getRelevantHint: getRelevantHint,
  getCompilerExplanation: getCompilerExplanation,
  getUsageStats: getUsageStats
};
