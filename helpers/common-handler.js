
var http = require('http');
var https = require('https');
var moment = require('moment');
var mongoose = require('../node_modules/mongoose');
const uuidv1 = require('uuid/v1');

var solutionsModel = require('../models/solutions.js');
var projectsModel = require('../models/projects.js');
var taskModel = require('../models/task.js');
var programsModel = require('../models/programs.js');

var notifications = require('./notifications');
var impTemplatesModel = require('../models/impTemplates');
var winston = require('../config/winston');
var userEntities = require('../helpers/user-entities');

var config = require('../config/config.json');

var fs = require('fs');



var api = {};

api.httpsPost = httpsPost;
api.pendingTask = pendingTask;
api.unFinishedProjects = unFinishedProjects;
api.subTaskPending = subTaskPending;
api.projectCompletedNotificationPoint = projectCompletedNotificationPoint;
api.createImprovementTemplate = createImprovementTemplate;
api.mapSolutionsToProgram = mapSolutionsToProgram;
api.projectCreateAndSolutionMapping = projectCreateAndSolutionMapping;
api.createTemplateAndPrject = createTemplateAndPrject;
api.updateProjectFromTemplateReferance = updateProjectFromTemplateReferance;
api.softDeleteUserProjects = softDeleteUserProjects;
api.storeRequestBody = storeRequestBody;
api.sendEmail = sendEmail;
api.updateCreateTypeByProgramId =updateCreateTypeByProgramId;

module.exports = api;

function httpsPost({ body, ...options }) {
    return new Promise((resolve, reject) => {
        request.post(options, callback);
    })
}

/**
 * the following function returns the notification obj for pending Task to prior to parameter day
 *
 * @param {*} days 
 * 
 */
function pendingTask(days = "") {
    return new Promise(async function (resolve, reject) {
        let upcomingSchedularDays = moment().add(days, 'd').format('YYYY-MM-DD');
        let queryEndDate = moment().add(days + 1, 'd').format('YYYY-MM-DD');
        // console.log(queryEndDate, "currentDate", upcomingSchedularDays);
        let pendingTasks = await taskModel.find({ status: { $ne: "complete" }, endDate: { $gte: upcomingSchedularDays, $lt: queryEndDate } });
        let arrayOfNotifications = [];
        if (pendingTasks) {
            await Promise.all(
                pendingTasks.map(async ele => {
                    let projectData = await projectsModel.findById({ "_id": ele.projectId });
                    let message = {
                        type: "taskPending",
                        title: "Pending Task !",
                        text: "A Task has been pending !",
                        action: "pending",
                        internal: false,
                        payload: {
                            projectId: projectData._id,
                            taskId: ele._id
                        },
                        user_id: projectData.userId,
                        created_at: moment().format()
                    }
                    // console.log("message",message);
                    arrayOfNotifications.push(message);

                })
            )
        }
        resolve({ notificationList: arrayOfNotifications });
    });
}

/**
 * the following function returns the notification obj for incompleted projects to prior to parameter day
 *
 * @param {*} days 
 * 
 */
function unFinishedProjects(days = "") {
    return new Promise(async function (resolve, reject) {
        let upcomingSchedularDays = moment().add(days, 'd').format('YYYY-MM-DD');
        let queryEndDate = moment().add(days + 1, 'd').format('YYYY-MM-DD');

        // console.log("currentDate",upcomingSchedularDays);
        let pendingTasks = await taskModel.find({ status: { $ne: "complete" }, endDate: { $gte: upcomingSchedularDays, $lt: upcomingSchedularDays } });
        var projectIds = [];

        let arrayOfNotifications = [];

        await Promise.all(
            pendingTasks.map(async ele => {
                if (projectIds.includes()) {
                } else {
                    projectIds.push(ele.projectId);
                }
            })
        )
        // check last
        await Promise.all(
            projectIds.map(async ele => {
                // console.log("ele",ele);
                let taskList = await taskModel.find({ status: { $ne: "complete" }, projectId: ele });
                let endDate;
                if (taskList) {

                    await Promise.all(
                        taskList.map(async task => {
                            if (endDate) {
                                if (moment(endDate).format() <= moment(task.endDate).format()) {
                                    endDate = task.endDate;
                                }
                            } else {
                                endDate = task.endDate;
                            }
                        })
                    );

                    // console.log("upcomingSchedularDays",upcomingSchedularDays);
                    if (moment(endDate).format('YYYY-MM-dd') == moment(upcomingSchedularDays).format('YYYY-MM-dd')) {
                        let projectInfo = await projectsModel.findById({ "_id": ele._id });
                        if (projectInfo) {
                            let message = {
                                type: "projectPending",
                                title: "Pending Project !",
                                text: "A Project has been pending !",
                                action: "pending",
                                internal: false,
                                payload: {
                                    projectId: projectInfo._id
                                },
                                user_id: projectInfo.userId,
                                created_at: moment().format()
                            }
                            // console.log("message",message);
                            arrayOfNotifications.push(message);
                        }
                    } else {
                        // console.log("not matching ",endDate);
                    }
                }
            })
        )
        resolve({ notificationList: arrayOfNotifications });
    });
}


/**
 * the following function returns the notification obj for subtask pending to prior to parameter day
 *
 * @param {*} days 
 * 
 */
function subTaskPending(days = "") {
    return new Promise(async function (resolve, reject) {
        let upcomingSchedularDays = moment().add(days, 'd').format('YYYY-MM-DD');
        let queryEndDate = moment().add(days + 1, 'd').format('YYYY-MM-DD');
        let taskDetails = await taskModel.find({ subTasks: { $elemMatch: { 'endDate': { $gte: upcomingSchedularDays, $lt: queryEndDate } } } });
        let arrayOfNotifications = [];
        if (taskDetails) {
            await Promise.all(
                taskDetails.map(async ele => {
                    let projectInfo = await projectsModel.findById({ "_id": ele.projectId });
                    if (ele.subTasks && projectInfo) {
                        await Promise.all(ele.subTasks.map(async subTaskInfo => {
                            // console.log(moment(subTaskInfo.endDate).format('YYYY-MM-DD'),"ele",upcomingSchedularDays);
                            if (upcomingSchedularDays == moment(subTaskInfo.endDate).format('YYYY-MM-DD')) {
                                let message = {
                                    type: "subTaskPending",
                                    title: "Pending SubTask !",
                                    action: "pending",
                                    internal: false,
                                    text: "A SubTask has been pending !",
                                    payload: {
                                        projectId: projectInfo._id,
                                        subTaskId: subTaskInfo._id,
                                        taskId: ele._id
                                    },
                                    user_id: projectInfo.userId,
                                    created_at: moment().format()
                                }
                                console.log("message", message);
                                arrayOfNotifications.push(message);
                            }
                        })
                        )
                    }
                })
            )
        }
        resolve({ notificationList: arrayOfNotifications });
    })
}


/**
 * it triggers the notification if the project all task are completed and end date of task is matching to current date.
 * @param {*} projectId 
 */

function projectCompletedNotificationPoint(projectId) {
    return new Promise(async function (resolve, reject) {
        let taskDetails = await taskModel.find({ 'projectId': projectId });


        let tot = 0;
        let endDateMatched = false;

        Promise.all(
            taskDetails.map(async ele => {
                let status = ele.status.toLowerCase();
                if (status == "completed") {
                    tot = tot + 1;
                }
                if (moment().format('YYYY-MM-DD') <= moment(ele.endDate).format('YYYY-MM-DD')) {

                    console.log("projects completed successfully");
                    endDateMatched = true;
                }
            })
        )
        console.log(endDateMatched, "endDateMatched", tot, "taskDetails", taskDetails)
        if (tot == taskDetails.length && endDateMatched) {
            try {

                let projectDetails = await projectsModel.findById({ '_id': projectId });
                if (projectDetails.status != 'completed') {
                    projectsModel.findOneAndUpdate({ '_id': projectId }, { status: "completed" }, (function (err, projectDoc) {
                        if (err) { console.log("while update", err); }
                    }));
                    let message = {
                        type: "projectCompleted",
                        title: "Congratulations!",
                        action: "completed",
                        internal: false,
                        text: "Congratulations you have completed project name on time !",
                        payload: {
                            projectId: projectId,
                        },
                        user_id: projectDetails.userId,
                        created_at: moment().format()
                    }
                    console.log("message", message);
                    let pushToKafka = await notifications.pushToKafka(message.user_id, message);

                }
            } catch (error) {
                console.log("while updating status of project", error)
            }
        }
    })
}


/**
 * it triggers the notification if the project all task are completed and end date of task is matching to current date.
 * @param {*} projectId 
 */

function createImprovementTemplate(obj) {
    return new Promise(async function (resolve, reject) {
        // let taskDetails = await taskModel.find({ 'projectId': projectId });

        // console.log(" obj.tasks", obj);

        var impTemplatesData = {
            title: obj.title,
            organisation: obj.organisation ? obj.organisation : "",
            duration: obj.duration ? obj.duration : '',
            difficultyLevel: obj.difficultyLevel ? obj.difficultyLevel : "",
            goal: obj.goal ? obj.goal : "",
            concepts: obj.concepts ? obj.concepts : "",
            keywords: obj.Keywords ? obj.Keywords : "",
            primaryAudience: obj.primaryAudience ? obj.primaryAudience : "",
            rationale: obj.rationale ? obj.rationale : "",
            recommendedFor: obj.recommendedFor ? obj.recommendedFor : "",
            risks: obj.risks ? obj.risks : "",
            protocols: obj.protocols ? obj.protocols : "",
            // originalAuthor:OriginalAuthor,
            createdAt: moment().format(),
            createdBy: obj.createdBy ? obj.createdBy : "",
            tasks: obj.tasks ? obj.tasks : "",
            vision: obj.Vision ? obj.Vision : '',
            problemDefinition: obj.Problemdefinition ? obj.Problemdefinition : "",
            prerequisites: obj.prerequisites ? obj.prerequisites : "",
            assumptions: obj.assumptions ? obj.assumptions : "",
            resources: obj.resources ? obj.resources : "",
            supportingDocuments: obj.supportingDocuments ? obj.supportingDocuments : "",
            approaches: obj.approaches ? obj.approaches : "",
            successIndicators: obj.successIndicators ? obj.successIndicators : "",
            suggestedProject: obj.suggestedProject ? obj.suggestedProject : "",
            creationType: obj.creationType ? obj.creationType : "",
            category: obj.category ? obj.category : ""

        }
        var dat = await impTemplatesModel.create(impTemplatesData);

        resolve(dat);

    })

}

function mapSolutionsToProgram(body) {
    return new Promise(async function (resolve, reject) {
        var requestBody = body;

        // console.log("=============",body.isStarted);
        if (requestBody.programId && requestBody.impTemplateId) {
            let programsDoc = await programsModel.findOne({ '_id': mongoose.Types.ObjectId(requestBody.programId) });
            if (programsDoc) {
                let templateData = "";
                if (requestBody.templateData) {
                    templateData = requestBody.templateData;
                } else {
                    templateData = await impTemplatesModel.findOne({ '_id': mongoose.Types.ObjectId(requestBody.impTemplateId) }).lean();
                }


                if (body.isStarted) {
                    templateData['isStarted'] = body.isStarted;
                }
                if (body.createdType) {
                    templateData['createdType'] = body.createdType;
                }
                if (body.startDate) {
                    templateData['startDate'] = body.startDate;
                }
                if (body.endDate) {
                    templateData['endDate'] = body.endDate;
                }

                if (templateData) {
                    var solutionSchema = new solutionsModel({

                        "resourceType": ["ImprovmentProject Solution"],
                        "language": ["English"],
                        "keywords": ["Framework", "Improvment Project"],
                        "concepts": [""],
                        "createdFor": [],
                        "type": "improvementproject",
                        "subType": "",
                        "registry": [],
                        "deleted": false,
                        "externalId": uuidv1(),
                        "name": templateData.title,
                        "description": "",
                        "author": "",
                        "createdAt": moment().format(),
                        "updatedAt": moment().format(),
                        "frameworkId": "",
                        "entityTypeId": "",
                        "entityType": "",
                        "status": "Open",
                        "isDeleted": false,
                        "isReusable": true,
                        "parentSolutionId": "",
                        "baseProjectDetails": [templateData],
                        "programId": mongoose.Types.ObjectId(requestBody.programId),
                        "roles": {
                            "projectManagers": [],
                            "programManagers": [],
                            "collaborators": []
                        }

                    });
                    let doc = await solutionsModel.create(solutionSchema);
                    if (doc) {
                        var projectObj = {
                            components: programsDoc.components
                        }
                        projectObj.components.push(doc._id);
                        let projectUp = await programsModel.findOneAndUpdate({ '_id': mongoose.Types.ObjectId(requestBody.programId) }, projectObj);

                        if (!projectUp) {
                            resolve({ status: "failed", solutionDetails: doc, message: "during updating project", error: er });
                        } else {
                            resolve({ "project": projectUp, status: "success", templateData: templateData, solutionDetails: doc });
                        }
                    } else {
                        reject("error while creating solution");
                    }
                } else {
                    resolve({ status: "failed", message: "invalid implTemplateId" });
                }
            } else {
                resolve({ status: "failed", message: "programId not found" });
            }
        } else {
            resolve({ status: "failed", message: "invalid request" });
        }
    });
}
function projectCreateAndSolutionMapping(obj) {
    return new Promise(async function (resolve, reject) {
        try {

            var userId = obj.userId;
            // console.log(element.userId, "element", obj.solutionId);

            

            // let solDoc;

            // if (obj.solutionDetails) {
            //     solDoc = obj.solutionDetails;
            // } else {
            //     solDoc = await solutionsModel.findOne({ '_id': mongoose.Types.ObjectId(obj.solutionId), 'programId': mongoose.Types.ObjectId(obj.programId) }).lean();
            // }
             let solDoc = await solutionsModel.findOne({ '_id': mongoose.Types.ObjectId(obj.solutionId), 'programId': mongoose.Types.ObjectId(obj.programId) }).lean();
            if (solDoc) {
                // if (element.roles == "projectManager") {
                //     solDoc.roles.projectManagers.push(element.userId);
                // }
                // if (element.roles == "programManager") {
                //     solDoc.roles.programManagers.push(element.userId);
                // }
                // if (element.roles == "collaborators") {
                // solDoc.roles.collaborators.push(obj.userId);
                // }


                if (solDoc.roles && solDoc.roles.collaborators) {
                    solDoc.roles.collaborators.push(userId)
                } else if (solDoc.roles && !solDoc.roles.collaborators) {
                    solDoc.roles = {
                        collaborators: []
                    }
                    solDoc.roles.collaborators.push(userId)
                } else {

                    solDoc.roles = {
                        collaborators: []
                    }
                    solDoc.roles.collaborators.push(userId)

                }
                // man

                var programManager = [];
                if (obj.managerId) {
                    solDoc.roles.programManagers.push(obj.managerId);

                    programManager.push(obj.managerId);
                }
                // console.log("updated ele", solDoc);

                let doc = "";
                var docInfo = "";
                if (obj.customBody) {

                    console.log("customBody", obj.customBody.endDate)
                    doc = obj.customBody;
                    docInfo = obj.customBody;
                } else {
                    doc = await solutionsModel.findOneAndUpdate({ '_id': mongoose.Types.ObjectId(obj.solutionId), 'programId': mongoose.Types.ObjectId(obj.programId) }, solDoc);
                    docInfo = doc.baseProjectDetails[0];
                }


                if (obj.createdType) {
                    docInfo.createdType = obj.createdType;
                }
                if (obj.isStarted) {
                    docInfo.isStarted = obj.isStarted;
                }

                if (doc) {
                    var splidata = docInfo.difficultyLevel;
                    // console.log("deficultyLevel", splidata);
                    var projectData =
                    {
                        // "id": "String",
                        "title": docInfo.title ? docInfo.title : "",
                        "goal": docInfo.goal ? docInfo.goal : "",
                        "userId": userId,
                        "collaborator": "",
                        "organisation": docInfo.organisation ? docInfo.organisation : "",
                        "duration": docInfo.duration ? docInfo.duration : "",
                        "difficultyLevel": docInfo.difficultyLevel ? docInfo.difficultyLevel : "",
                        "status": docInfo.status,
                        "createdAt": moment().format(),
                        "programId": obj.programId,
                        "solutionId": obj.solutionId,
                        "programManagers": programManager,
                        //  "lastSync": { type : Date, default: Date.now },
                        "lastSync": moment().format(),
                        "primaryAudience": "",
                        "concepts": docInfo.concepts ? docInfo.concepts : "",
                        "keywords": docInfo.keywords ? docInfo.keywords : "",
                        "vision": docInfo.vision ? docInfo.vision : "",
                        "problemDefinition": docInfo.problemDefinition ? docInfo.problemDefinition : "",
                        "prerequisites": docInfo.prerequisites ? docInfo.prerequisites : "",
                        "assumptions": docInfo.prerequisites ? docInfo.prerequisites : "",
                        "resources": docInfo.resources ? docInfo.resources : "",
                        "supportingDocuments": docInfo.supportingDocuments ? docInfo.supportingDocuments : "",
                        "approaches": docInfo.approaches ? docInfo.approaches : "",
                        "successIndicators": docInfo.successIndicators ? docInfo.successIndicators : "",
                        "suggestedProject": docInfo.suggestedProject ? docInfo.suggestedProject : "",
                        "category": docInfo.category ? docInfo.category : "",
                        "createdType": docInfo.createdType ? docInfo.createdType : "",
                        "isStarted": docInfo.isStarted ? docInfo.isStarted : false,
                        "startDate": docInfo.startDate ? docInfo.startDate : "",
                        "endDate": docInfo.endDate ? docInfo.endDate : ""
                    }
                    var projectIDs = [];
                    let projectDoc = await projectsModel.create(projectData);
                    if (projectDoc) {
                        projectIDs.push(projectDoc._id);
                        let taskInput = docInfo;
                        var subTasksArray = [];
                        projectDoc.tasks = [];
                        await Promise.all(docInfo.tasks.map(async function (el) {
                            var projectTaskSchema = {
                                "projectId": projectDoc._id,
                                "title": el.title,
                                "imageUrl": el.imageUrl ? el.imageUrl : "",
                                "file": el.file ? el.file : {},
                                "remarks": el.remarks ? el.remarks : "",

                                // "startDate": element.start_date,
                                // "endDate": element.end_date,
                                "status": el.status ? el.status : "not yet started",
                                "assignedTo": [],
                                "lastSync": moment().format(),
                                "subTasks": el.subTasks,
                                "programId": solDoc.programId,
                                "userId": userId,
                                "createdAt": moment().format()
                            };

                            let taskDoc = await taskModel.create(projectTaskSchema);
                            if (!taskDoc) {
                                console.log("err", err);
                                // deferred.resolve(err);
                            } else {

                                projectDoc.tasks.push(taskDoc);
                                console.log("task created", taskDoc._id);
                            }
                        })
                        );
                        var resp = {
                            projectData: projectDoc,
                            status: "success",
                            solutionId: obj.solutionId,
                            userId: obj.userId,
                            projectIds: projectIDs,
                            message: "updated to db"
                        }
                        resolve(resp);
                    }
                }
            } else {
                reject({ status: "failed", "message": "solution id not found while creating project" });
            }
        } catch (err) {

            console.log("erorr-----", err);
            let obj = {
                status: "failed",
                errorObject: err,
                message: err.message,
                stack: err.stack
            };
            winston.error(obj);
            reject(obj);
        }
    });
    // return deferred.promise;
}

/**
 * 
 * this function createTemplateAndPrject is used For to get the create the Project for the User
 * 
 * @param {*} req    
 */
function createTemplateAndPrject(projectDocument, userId) {
    return new Promise(async function (resolve, reject) {
        try {
            // syncData.tasks = req.body.tasks;
            projectDocument.createdBy = userId;
            projectDocument.creationType = config.createdSelf;
            projectDocument.startDate = projectDocument.startDate;
            projectDocument.endDate = projectDocument.endDate;


            let data = await createImprovementTemplate(projectDocument);
            if (data._id) {
                let obj = {
                    programId: config.myProjectMapingProgramId,
                    impTemplateId: data._id,
                    isStarted: projectDocument.isStarted ? projectDocument.isStarted : false,
                    createdType: projectDocument.createdType ? projectDocument.createdType : "",
                    startDate: projectDocument.startDate ? projectDocument.startDate : "",
                    endDate: projectDocument.endDate ? projectDocument.endDate : "",
                    templateData: data
                }

                // console.log("obj",obj)
                let response = await mapSolutionsToProgram(obj);

                // console.log("response",response);

                if (response && response.solutionDetails._id) {
                    let json = {
                        programId: config.myProjectMapingProgramId,
                        userId: userId,
                        solutionId: response.solutionDetails._id,
                        isStarted: projectDocument.isStarted ? projectDocument.isStarted : false,
                        createdType: projectDocument.createdType ? projectDocument.createdType : "",
                        solutionDetails: response.solutionDetails
                    }
                    let projectInfo = await projectCreateAndSolutionMapping(json);

                    if (projectInfo && projectInfo.status == "success") {
                        // let userInfo = await userEntities.userEntities(req);
                        resolve({ status: "success", response: projectInfo });
                    } else {
                        reject({ status: "failed", message: projectInfo });
                    }

                } else {
                    reject({ status: "failed", message: response });
                }

            } else {
                reject({ status: "failed", message: data });
            }
        } catch (error) {
            console.log("err", error);
            reject({ status: "failed", message: error });
        }
    });
}

/**
 * 
 * this function updateProjectFromTemplateReferance is used For to create the 
 * Project from template for the user 
 * @param {*} req    
 */
function updateProjectFromTemplateReferance(projectDocument, userId) {
    return new Promise(async function (resolve, reject) {
        try {
            let obj = {
                programId: config.myProjectMapingProgramId,
                impTemplateId: projectDocument.templateId,
            }
            let response = await mapSolutionsToProgram(obj);
            if (response.status && response.status == "success") {

                let json = {
                    programId: config.myProjectMapingProgramId,
                    userId: userId,
                    solutionId: response.solutionDetails._id,
                    customBody: projectDocument,
                    solutionDetails: response.solutionDetails
                }
                if (projectDocument.createdType) {
                    json.customBody.createdType = projectDocument.createdType;
                }
                if (projectDocument.isStarted) {
                    json.customBody.isStarted = projectDocument.isStarted;
                }
                let projectInfo = await projectCreateAndSolutionMapping(json);
                if (projectInfo.status && projectInfo.status == "success") {
                    resolve({ status: "success", response: projectInfo });
                } else {
                    // console.log("errror ----------");
                    reject({ status: "failed", message: projectInfo });
                }
            } else {
                if (response.message) {
                    resolve({ status: "failed", message: response.message });
                } else {
                    resolve({ status: "failed", message: response });
                }
            }
        } catch (Excep) {
            winston.error(Excep);
            resolve({ status: "failed", message: Excep });
        }
    });
}

async function softDeleteUserProjects(userId) {
    return new Promise(async function (resolve, reject) {
        try {
            let projectsAllList = await projectsModel.find({ userId: userId });
            if (projectsAllList.length > 0) {
                let softDelete = await projectsModel.update({ userId: userId }, { isDeleted: true });
                console.log("softDelete", softDelete);
                winston.error("solft deleted all user project userId : " + userId);
            } else {
                winston.error("delete has no projects");
                resolve({ status: "success", message: "" })
            }
        } catch (Excep) {
            winston.error("failed at softDeleting the Projects", Excep);
            resolve({ status: "failed", message: Excep });
        }
    })
}

async function storeRequestBody(req,projectsList) {
    return new Promise(async function (resolve, reject) {
        try {
            var dir = './userRequests/';

            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir);
            }

            let date = moment().format('Y_MM_DD:h_mm_ss_a');
            fs.writeFileSync(dir+"userSyncRequest_"+req.body.userId+"_"+date+".json", JSON.stringify(req.body));
            fs.writeFileSync(dir+"userOldProjects_"+req.body.userId+"_"+date+".json", JSON.stringify(projectsList));

            winston.error("logs saved for user "+req.body.userId);
            resolve({ status:"succes",message:"logs saved"});

        } catch (Excep) {
            winston.error("failed at storing logs for userId : "+req.body.userId+" Exp : "+Excep);
            resolve({ status: "failed", message: Excep });
        }

    });
}

/**
 * sendEmail() is used to send an email from using kendra service
 * @body of the email
 */

function sendEmail(body){
    return new Promise(async function(resolve, reject) {
        // request.post(options, callback); 
        try {

           
            let headers = {
                'X-authenticated-user-token': req.headers['x-auth-token'],
                'Content-Type': 'application/json',
                "Authorization": "Bearer "+req.headers['x-auth-token']
            }
            // let url = config.dhiti_config.api_base_url + config.dhiti_config.getProjectPdf;
            // // let url = config.dhiti_config.api_base_url + config.dhiti_config.montlyReportGenerate;
            // let response = await httpRequest.httpsPost(headers, reportData, url);

            request({
                url: config.kendraService.base+config.kendraService.sendEmail,
                method: "POST",
                headers: headers,
                json: true,   // <--Very important!!!
                body: body
            }, function (error, response, body){
               if (error) {
                   console.log("error",error);
                    winston.error("Error at httpPost()" + error);
                    reject(body);
                } else {
                    console.log(response.statusCode,"body",body);
                    resolve(body);
                }
            });


        }catch(error){
            console.log("err",error);
            resolve({ status:"failed",message:"error while sending data" });
        }
    })
}

/**
 * updateCreateTypeByProgramId is If CreatedType blank
 * @param {*} projectId 
 * @param {*} userId 
 * @param {*} programId 
 */
function updateCreateTypeByProgramId(projectInfo,userId){
    return new Promise(async function(resolve, reject) {
        try {
            if(projectInfo.programId && projectInfo._id){
                let programsData = await programsModel.findOne({ "_id":projectInfo.programId }).lean();
                if(programsData){
                    if(programId==config.myProjectMapingProgramId){

                        // if(projectInfo.templateId)
                        // updsting to by referance to project if createdType is empty As disccusion with @sriram
                        let projectUpdate =  await projectsModel.findOneAndUpdate({ "_id":projectInfo._id,"programId":projectInfo.programId,userId:userId,createdType:{ $eq:"" } },{ createdType:config.createdFromReferance })
                        if(projectUpdate){
                            resolve({ status:"success",message :"" });
                        }             
                    }else{
                        resolve({ status:"failed",message:"not matching with program Id" });
                    }
                }
            }else{
                resolve({ status:"failed",message:"invalid request" });
            }
        }catch(error){
            console.log("err",error);
            resolve({ status:"failed",message:"error while sending data" });
        }
    });
}