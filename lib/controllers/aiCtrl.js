"use strict";

/**
 * Created by Samuel Truniger.
 *
 * Controller for hanlding request to chatGPT for hints/compiler-messages.
 */

var OpenAI = require("openai"),
  db = require("../models"),
  config = require("../config/config.js");

const openai = new OpenAI({
  apiKey: config.aiAPIKey
});

// function which makes a call to openai API to get the relevant hint for the student solution
var getRelevantHint = async function (req, res) {
  // extract the projectId from the route
  let _username = req.params.username;
  let _courseId = req.params.courseId;
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

    // find requesting user and return user code
    let user = await db.User.findOne({
      where: { username: _username },
      attributes: ["id"]
    });
    let userCode = await db.UserProject.findAll({
      where: { courseId: _courseId, projectId: _projectId, userId: user.id },
      attributes: [
        "id",
        "files",
        "updatedAt",
        "projectId",
        "courseId",
        "projectId",
        "userId"
      ]
    });

    if (project === null) {
      res.status(404).json({ message: "The project does not exist." });
    } else if (userCode === null) {
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

      let filteredUserCode
      userCode.forEach((file) => {
        let userFilesArray = JSON.parse(file.files);
        filteredUserCode = userFilesArray.filter(
          (file) => !file.isStatic
        );
      });
      let userCodeContent = "";
      filteredUserCode.forEach((code) => {
        userCodeContent += code.content + "\n";
      });

      // get staticFiles content if existing in projects
      let staticFiles = project.fileSet.filter((file) => file.isStatic);
      let staticFilesContent = "";
      if (staticFiles.length > 0) {
        staticFiles.forEach((file) => {
          staticFilesContent += file.content + "\n";
        });
      }

      let hints = JSON.stringify(req.body.hints);
      let prompt = `
        Deine Aufgabe als KI-Assistent ist es, die bereitgestellten Informationen (aufgabenBeschreibung, studentVersion, predefinedFiles, musterLösung, hinweise), welche mit XML tags abgegrenzt sind, \
        sorgfältig zu analysieren, um jenen Hinweis zu identifizieren, welcher den Studierenden beim Lösen der Aufgabe am ehesten unterstützt. \
        Berücksichtige bei deiner Analyse nur jene Hinweise, welche in der aktuellen Version des Studentencodes (studentVersion) noch nicht umgesetzt sind. Es kann auch vorkommen, dass die Studentenversion (studentVersion) aus 2 Klassen besteht. \
        In manchen Fällen kann es vorkommen, dass es vordefinierte Files (predefinedFiles) gibt, welche von Studierenden nicht angepasst werden können. Du kannst diese ebenfalls in die Analyse miteinbeziehen. Beachte jedoch, dass die Hinweise sich nicht auf diese Files beziehen.
        Sollte ein relevanter Hinweis gefunden werden, welcher noch nicht in der Lösung des Studierenden umgesetzt ist, gib bitte nur die ID dieses Hinweises zurück. \
        Falls alle Hinweise bereits umgesetzt sind und du keinen relevanten Hinweis identifizieren konntest, gib -1 zurück. \
        Am wichtigsten ist, dass du lediglich eine Zahl zurückgibst ohne weiteren Text, da deine Antwort sonst nicht validieren kann.

        Hier sind alle notwendigen Informationen für deine Analyse:
        <aufgabenBeschreibung>
        ${desc}
        </aufgabenBeschreibung>
        <studentVersion>:
        ${userCodeContent}
        </studentVersion>
        <predefinedFiles>
        ${staticFilesContent}
        </predefinedFiles>
        <musterLösung>:
        ${solution}
        </musterLösung>
        <hinweise>:
        ${hints}
        </hinweise>`;

      let openAIResponse = await openai.chat.completions.create({
        messages: [
          // {
          //   role: "system",
          //   content:
          //     "Du bist ein KI-Assistent für Studierende. Deine Aufgabe ist, die bereitgestellten Informationen (abgegrenzt mit XML tags) sorgfältig zu analysieren, \
          //     um den für den Studierenden relevantesten Hinweis zu ermitteln. Der Hinweis sollte den Studierenden bei der Lösungsfindung der Aufgabe unterstützen."
          // },
          { role: "user", content: prompt }
        ],
        model: "gpt-4-0125-preview"
      });
      res.status(200).json(openAIResponse);
    }
  } catch (err) {
    console.log(err);
    res.status(500).json({
      message: "An error occurred while fetching the relevant hint using AI."
    });
  }
};

module.exports = {
  getRelevantHint: getRelevantHint
};
