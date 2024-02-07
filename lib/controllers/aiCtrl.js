'use strict';

/**
 * Created by Samuel Truniger.
 *
 * Controller for hanlding request to chatGPT for hints/compiler-messages.
 */

var OpenAI = require("openai"),
  config = require("../config/config.js");

const openai = new OpenAI({
  apiKey: config.aiAPIKey
});

// function which makes a call to openai API to get the relevant hint for the student solution
var getRelevantHint = function (req, res) {
  let prompt = `
  Deine Aufgabe als KI-Assistent ist es, die bereitgestellten Informationen (aufgabenBeschreibung, studentVersion, musterLösung, hinweise), welche mit XML tags abgegrenzt sind, \
  sorgfältig zu analysieren, um jenen Hinweis zu identifizieren, welcher den Studierenden beim Lösen der Aufgabe am ehesten unterstützt. \ 
  Berücksichtige bei deiner Analyse nur jene Hinweise, welche in der aktuellen Version des Studentencodes (studentVersion) noch nicht umgesetzt sind. \
  Sollte ein relevanter Hinweis gefunden werden, welcher noch nicht in der Lösung des Studierenden umgesetzt ist, gib bitte nur die ID dieses Hinweises im Feld zurück. \
  Falls alle Hinweise bereits umgesetzt sind und du keinen relevanten Hinweis identifizieren konntest, gib -1 im Feld zurück. \
  Am wichtigsten ist, dass du lediglich eine Zahl zurückgibst ohne weiteren Text, da deine Antwort sonst nicht validieren kann.

  Hier sind alle notwendigen Informationen für deine Analyse:
  <aufgabenBeschreibung>
  ${req.body.desc} 
  </aufgabenBeschreibung>
  <studentVersion>: 
  ${req.body.code}
  </studentVersion>
  <musterLösung>: 
  ${req.body.solution}  
  </musterLösung>
  <hinweise>:
  ${JSON.stringify(req.body.hints)}
  </hinweise>`;

  openai.chat.completions
    .create({
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
    })
    .then((chat) => {
      res.status(200).json(chat);
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json({
        message: "An error occurred while fetching the relevant hint using AI."
      });
    });
};

module.exports = {
  getRelevantHint: getRelevantHint
};
