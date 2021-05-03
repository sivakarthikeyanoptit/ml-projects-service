const { expect } = require("chai");
let appPath = require("../../app");
let mockServer;

let userProjects = function () {

    describe('userProjects create project Api', () => {

        beforeEach(() => {
            mockServer = chai.request(appPath);
        });

        it('Success userProjects create project Api',function (done) {
            mockServer.post('/improvement-project/api/v1/userProjects/add')
            .set('Authorization', 'Bearer ' + testToken)
            .set('X-authenticated-user-token', testToken)
            .send({
                "title": "Project 1",
                "description": "Project 1 description",
                "startDate": "2020-09-29T09:08:41.667Z",
                "endDate": "2020-09-29T09:08:41.667Z",
                "tasks": [
                    {
                        "_id": "289d9558-b98f-41cf-81d3-92486f114a49",
                        "name": "Task 1",
                        "description": "Task 1 description",
                        "status": "notStarted",
                        "startDate": "2020-09-29T09:08:41.667Z",
                        "endDate": "2020-09-29T09:08:41.667Z",
                        "lastModifiedAt": "2020-09-29T09:08:41.667Z",
                        "type": "single",
                        "isDeleted" : false,
                         "remarks" : "Tasks completed",
                         "assignee" : "Aman",
                        "children": [
                            {
                                "_id": "289d9558-b98f-41cf-81d3-92486f114a50",
                                "name": "Task 2",
                                "description": "Task 2 description",
                                "status": "notStarted",
                                "children": [],
                                "startDate": "2020-09-29T09:08:41.667Z",
                                "endDate": "2020-09-29T09:08:41.667Z",
                                "lastModifiedAt": "2020-09-29T09:08:41.667Z",
                                "type": "single",
                                "isDeleted" : false
                            }
                        ]
                    }
                ],
                "programId": "5beaaaa6af0065f0e0a10605",
                "programName": "New Project Program",
                "entityId" : "5beaa888af0065f0e0a10515",
                "categories": [
                    {
                        "value": "5ef98eb508149c7dfdb1fd60",
                        "label": "teacher"
                    },
                    {
                        "value": "",
                        "label": "other"
                    }
                ],
                "status": "notStarted",
            })
            .end((err,res) => {
                let response = res.body;
                expect(response.status).to.equal(200);
                done();
            })
        });
    });

    describe('userProjects getProject Api', () => {

        beforeEach(() => {
            mockServer = chai.request(appPath);
        });

        it('Success userProjects getProject api',function (done) {
            mockServer.post('/improvement-project/api/v1/userProjects/getProject?page=2&limit=500&filter=createdByMe')
            .set('Authorization', 'Bearer ' + testToken)
            .set('X-authenticated-user-token', testToken)
            .send({
                "role" : "HM",
                "state" : "bc75cc99-9205-463e-a722-5326857838f8",
                "district" : "b54a5c6d-98be-4313-af1c-33040b1703aa",
                "school" : "2a128c91-a5a2-4e25-aa21-3d9196ad8203"
            })
            .end((err,res) => {
                let response = res.body;
                expect(response.status).to.equal(200);
                done();
            })
        });
    });


}

module.exports = userProjects;  