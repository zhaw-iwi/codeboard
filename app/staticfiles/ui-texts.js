angular.module('codeboardApp').constant('UITexts', {
  CODE_REVIEW_INFO:
    'Gratulation zum erfolgreichen Abschluss dieser Aufgabe. Du kannst dein Code gerne erneut submitten, um ein neues Code-Review zu erhalten. Du findest untenstehend Code-Review deiner letzten Submission.',
  CODE_REVIEW_DISABLED:
    'Untenstehend findest du das Review deiner letzten Submission. Um eine neue Überprüfung zu starten, musst du zuerst eine neue Submission einreichen.',
  CODE_REVIEW_LOADING: 'Das Code-Review wird durchgeführt... ',
  CODE_REVIEW_LIMIT_EXCEEDED:
    'Es tut mir leid, aber ich kann dir momentan kein Code-Review geben, da du dein Anfragelimit erreicht hast. Du kannst diesen Service ab nächster Woche wieder nutzen.',
  CODE_REVIEW_ERROR: 'Es ist ein Fehler beim Laden des Code-Reviews aufgetreten. Bitte versuche es später erneut.',
  COMPILER_INFO:
    'Nutze diesen Tab, um dir Exceptions erklären zu lassen. Wenn du das Programm ausführst und dieses Fehler beinhaltet, wird automatisch in diesen Tab gewechselt.',
  COMPILER_CODE_CHANGED:
    'Wie es scheint hast du Änderungen im Code vorgenommen. Bitte führe den Code erneut aus, oder teste das Programm, um diese zu überprüfen.',
  COMPILER_LOADING: 'Die Erklärung für den Kompilierungsfehler wird geladen...',
  COMPILER_ERROR: 'Pass auf! Dein Code weist einen Fehler auf.',
  COMPILER_SUCCESS:
    'Super, dein Programm lässt sich ohne Fehler Ausführen. Prüfe mit dem Test, ob dein Programm auch die richtigen Ausgaben macht.',
  CODING_ASSISTANT_INFO:
    'Gerne erkläre ich dir deinen Code genauer. Bitte markiere den Code, welchen du erklärt haben willst und drücke auf den untenstehenden Button. Die aktuellste Erklärung wird dir jeweils zu oberst angezeigt.',
  CODING_ASSISTANT_LOADING: 'Die Erklärung für den ausgewählten Code wird geladen...',
  CODING_ASSISTANT_LIMIT_EXCEEDED:
    'Du hast dein Limit für Anfragen an den AI-Assistenten erreicht. Du kannst diesen Service ab nächster Woche wieder nutzen.',
  HINT_INFO:
    'Nutze diesen Tab, wenn du Schwierigkeiten hast, diese Aufgabe zu lösen. Drücke auf den grünen Knopf und lass dir Tipps zu dieser Aufgabe anzeigen. Beachte, dass die Tipps abhängig vom Stand deiner Lösung angezeigt werden.',
  HINT_LIMIT_EXCEEDED: 'Du hast alle verfügbaren Tipps für diese Aufgabe abgefragt.',
  QA_INFO:
    'Nutze die Chat-Funktion, falls dir die anderen Helper-Systeme nicht weiterhelfen. Du erhältst ein E-Mail, sobald deine Frage beantwortet wurde.',
  QA_ERROR_QUESTION:
    'Fehler beim Senden deiner Nachricht. Versuche es später noch einmal oder wende dich an den Systemadministrator.',
  QA_ERROR_ANSWER: 'Beim Senden der Antwort ist ein Fehler aufgetreten. Bitte noch einmal versuchen',
  QA_NO_INPUT_QUESTION: 'Nutze das darüberliegende Feld, um dein Anliegen zu beschreiben.',
  QA_NO_INPUT_ANSWER: 'Es wurde noch keine Antwort formuliert',
  QA_CHATBOT_LIMIT_EXCEEDED:
    'Du hast die maximale Anzahl an Anfragen an den Chatbot erreicht. Dein Limit wird nächste Woche zurückgesetzt. Bitte wende dich direkt an den Dozenten, wenn du trotzdem eine Antwort benötigst.',
});
