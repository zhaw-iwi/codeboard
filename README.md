<br />
<div align="center">
  <img src="https://upload.wikimedia.org/wikipedia/commons/e/e6/ZHAW_Logo.svg" alt="Logo" width="120" height="120">
  <h3 align="center">codeboard</h3>
  codeboard is a web-based IDE to teach programming in the classroom. This is the core of the codeboard web application. 
  <p>Part of the <a href="https://github.com/codeboardio">codeboard.io</a> project.</p>
</div>

<!-- INSTALLATION -->
## Installation
Clone the repository to your server
```
git clone https://github.com/zhaw-iwi/codeboard.git
```

Change into the codeboard folder and install all dependencies
```
cd codeboard

# Install all server dependencies
npm install 

# Make sure to have Bower installed
sudo npm install -g bower

# Install all client dependencies
bower install
```

codeboard uses Grunt to automate various tasks. Make sure to have the Grunt-CLI installed
```
sudo npm install -g grunt-cli 
```
### Requirements
codeboard requires NodeJS, MySQL, MongoDB.

* Nodejs: tested with version 18.18.0
* MongoDB: tested with version 5.7.0

### Preparing the server
We need to install MySQL and create a database:

```
# Update packages and sources
sudo apt-get update

# Install MySQL and set the the root password
sudo apt-get install mysql-server

# Tell MySQL to create its DB directory structure
sudo mysql_install_db

# Run a security script
sudo mysql_secure_installation

# You should now create a db user with limited privilges and a secure password.
# Then create the database for codeboard using the MySQL command: CREATE SCHEMA `codeboard` ;
# You might also want to create other database, e.g. for testing: CREATE SCHEMA `codeboard-test`;
```

We also need to install MongoDB. Follow the instructions [here](https://www.digitalocean.com/community/tutorials/how-to-install-mongodb-on-ubuntu-14-04).

<!-- CONFIGURATION -->
## Configuration
codeboard requires a number of settings, like database names, passwords, etc.
All those configurations must be set in the following files
```
lib/config/env/all.js
lib/config/env/development.js
lib/config/env/production.js
lib/config/env/test.js
```

<!-- RUN AND TEST -->
## Run and Test
Use the following command to run codeboard (in development mode)
```
grunt serve
```

Build an optimize version for production deployment
```
# Will create a folder "dist"
# Deploy from dist using command: NODE_ENV=production node server.js
grunt build 
```

Test codeboard
```
# run client-side tests
grunt test:client

# run server-side tests
grunt test:server
```

<!-- IMPLEMENTATION -->
## Implementation
### API Documentation
Explore the API endpoints using the following [Postman collection](https://documenter.getpostman.com/view/18706406/2sA3BkcYVT). This collection includes all the necessary requests to interact with our application effectively.

## License
This project is available under the MIT license. See [LICENSE](https://github.com/codeboardio/mantra/blob/master/LICENSE) for the full license text.

_Important_: This project may use 3rd party software which uses others licenses. If you're planning to use this project, make sure your use-case complies with all 3rd party licenses.
