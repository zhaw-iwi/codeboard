# codeboard code documentation

## Table of Contents

- [1. Overview](#overview)
- [2. AI Implementations](#ai-implementations)

## 1. Overview <a name="overview"></a>
This document serves as a documentation for important implementations in this codebase.

## 2. AI Implementations <a name="ai-implementations"></a>
### 2.1 Request Limits
A middleware has been implemented to check if a user is allowed to make an request to openai for the following cases (endpoints in `routes.js`):

- **Hints**: Uses the `checkReqLimit` middleware to check if the user is allowed to make a request. If not, the default hint functionality is triggered.
- **Compiler (Run)**: Uses the `checkReqLimit` middleware to check if the user is allowed to make a request. If not, the default compiler explanation functionality is triggered. When the user runs the application, the result of the compilation (success or compilation error) is sent back to the client. If there is a compilation error, the corresponding AI endpoint is called to get an explanation for the error.
- **Code Explanation**: Uses the `checkReqLimit` middleware to check if the user is allowed to make a request. If not, the default compiler explanation functionality is triggered.

When the user tests the code (Test button), the request is fully handled in the backend. Unlike running the project, the output of the compilation is not sent back to the client after the compilation finishes. Therefore, there is no endpoint called to explain the error using AI if a compilation error occurs during testing. Instead, if a compilation error occurs during testing, the user's request limit is checked in `compilationSrv.js` within the `onCompilationError` function.



