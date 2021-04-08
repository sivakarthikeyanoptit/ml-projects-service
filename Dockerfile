FROM node:12

WORKDIR /opt/unnati

#copy package.json file
COPY package.json /opt/unnati

#install node packges
RUN npm install

#copy all files 
COPY . /opt/unnati

#expose the application port
EXPOSE 4301

#start the application
CMD node app.js
