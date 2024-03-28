const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { promisify } = require("util");
const { LogInCollection, skills, Job, Project, Task, Certification, fetchCollectionDatawithStatus, createApplicantCollection, addDataToCollection, fetchCollectionData, updateDataToCollection, User } = require("../mongo")
const nodemailer = require('nodemailer');
const { nanoid } = require("nanoid");
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const formidable = require('formidable');
const { title } = require('process');
const PDFLib = require('pdf-lib');
const mammoth = require('mammoth');
const PDFDocument = require('pdfkit');
const { convert } = require('html-to-text');
const htmlToPdf = require('html-pdf');
const Razorpay = require('razorpay');
const sdk = require('api')('@certifier/v1.0#8fcj45ullw3cxug');





//User Section

exports.register = async (req, res) => {
    try {
        const { name, email, password, password2 } = req.body;

        const existingUser = await LogInCollection.findOne({ email });
        if (existingUser) {
            return res.render('register', {
                message: 'Eamil already in use, Please use different email.'
            });
        }
        else if (password !== password2) {
            return res.render('register', {
                message: 'Passward does not match, Please try again.'
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        try {
            await LogInCollection.create({ name, email, password: hashedPassword });
        } catch (error) {
            console.error("Error inserting data:", error);
        }

        res.status(201).render("login", {
            message: "User Registred.."
        });
    } catch (error) {
        console.error("Error occurred during registration:", error);
        res.status(500).send("Internal Server Error");
    }
}

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            res.render('login', { message: "Please enter email and password" });

        }

        const user = await LogInCollection.findOne({ email });
        if (!user) {
            res.render('login', { message: "Email or Password incorrect" });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            res.render('login', { message: "Email or Password incorrect" });
        }
        if (password.length == 6) {
            res.render('cpass', {
                message: 'Passward should be more then 8 Character.'
            });
        }
        else if (password.length > 8) {
            console.log("Updated pasward login start")

            const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, {
                expiresIn: process.env.JWT_EXPIRES_IN,
            });
            console.log("The Token Genarated");

            const cookieOptions = {
                expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRES * 24 * 60 * 60 * 1000),
                httpOnly: true,
            };
            res.cookie("demo", token, cookieOptions);
            res.render('index', { message: email });


        }

    } catch (error) {
        console.error("Error occurred during login page:", error);
        res.status(500).send("Internal Server Error login");
    }
};

exports.cpass = async (req, res) => {
    try {
        const { email, password, password2 } = req.body;
        if (!email || !password) {
            res.render('login', { message: "Please enter email and password" });

        }

        const user = await LogInCollection.findOne({ email });
        if (!user) {
            console.log("3");
            res.render('login', { message: "User Not found" });
        }
        else if (password !== password2) {
            return res.render('cpass', {
                message: 'Both passward does not match, Please try again.'
            });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const updatedUser = await LogInCollection.findOneAndUpdate(
            { email: email },
            { password: hashedPassword },
            { new: true }
        );

        if (updatedUser) {
            console.log("6");
            console.log("Password updated successfully");
            res.render('login', {
                message: 'Password updated successfully'
            });

        } else {
            console.log("User not found");
            res.render('cpass', {
                message: 'Problem to update password.'
            });
        }

    } catch (error) {
        console.error("Error occurred during login:", error);
        res.status(500).send("Internal Server Error login");
    }
};

exports.isLoggedIn = async (req, res, next) => {
    const token = req.cookies.demo;

    if (!token) {
        return res.redirect("/login");
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await LogInCollection.findById(decoded.id);
        if (!user) {
            throw new Error("User not found");
        }
        req.user = user;
        next();


    } catch (error) {
        console.error("Token verification error:", error);
        res.clearCookie("demo");
        res.redirect("/login");
    }
};

exports.isLoggedIn2 = async (req, res, next) => {
    const userEmail = req.user.email;
    next();
};


exports.logout = (req, res) => {
    res.clearCookie('demo');
    console.log("cookie clear");
    return res.render('login', {
        message: 'You have successfully logged out!'
    });

};

exports.career = async (req, res, next) => {
    try {
        const jobs = await Job.find();
        res.render('career', { jobs });

    } catch (error) {
        console.error("Error occurred during login:", error);
        res.status(500).send("Internal Server Error");
    }
};
exports.lcareer = async (req, res, next) => {
    try {
        const jobs = await Job.find();
        res.render('lcareer', { jobs });

    } catch (error) {
        console.error("Error occurred during login:", error);
        res.status(500).send("Internal Server Error");
    }
};

exports.apply = async (req, res, next) => {
    try {
        console.log("start");
        const { name, email, project, jobTitleInput, number, gender, qualification, skilllevel, college, ld, learnedabout } = req.body;

        let data = { name, email, project, jobTitleInput, number, gender, qualification, skilllevel, college, ld, learnedabout };
        let title = jobTitleInput.replace(/\s+/g, '').toLowerCase();

        const applicantCollectionName = `applicants_${title}`;
        const message = "Successfully Applied for " + jobTitleInput;
        try {
            await addDataToCollection(applicantCollectionName, data)
            const jobs = await Job.find();
            res.render('career', { jobs, message });
        }
        catch {
            console.log("error in adding data")

        }

    } catch (error) {
        console.error("Error occurred during login:", error);
        res.status(500).send("Internal Server Error");
    }
};



exports.userHome = async (req, res, next) => {
    try {
        console.log("start");
        const usermail = req.user.email;
        console.log("User email inside userHome:" + usermail)
        res.render('user-home');


    } catch (error) {
        console.error("Error occurred during login:", error);
        res.status(500).send("Internal Server Error");
    }
};

exports.project = async (req, res, next) => {
    try {
        const usermail = req.user.email;
        const curruser = await LogInCollection.findOne({ email: usermail });

        console.log("User id:" + curruser._id)
        const projects = await Project.find();
        const filteredProjects = [];
        for (const project1 of projects) {
            if (project1.tasks.includes(curruser._id)) {
                filteredProjects.push(project1);
            }
        }

        const projectsWithCandidates = await Promise.all(filteredProjects.map(async (project) => {
            const candidates = [];

            await Promise.all(project.tasks.map(async (candidateId) => {
                const candidate = await LogInCollection.findById(candidateId);
                const candidateName = candidate ? candidate.name : 'Unknown';
                candidates.push(candidateName);
            }));

            return {
                ...project.toObject(),
                candidates
            };
        }));

        res.render('user-project', { projectsWithCandidates });


    } catch (error) {
        console.error("Error occurred during login:", error);
        res.status(500).send("Internal Server Error Project");
    }
};



exports.userShowTask = async (req, res, next) => {
    try {
        const usermail = req.user.email;
        const curruser = await LogInCollection.findOne({ email: usermail });
        let { title } = req.body;
        let Taskss = await User.find({ name: curruser.name, projectTitle: title });

        res.render('user-task', { title, Taskss });

    } catch (error) {
        console.error("Error occurred during :", error);
        res.status(500).send("Internal Server Error Project");
    }
};



exports.updatelink = async (req, res) => {
    try {
        const { githubLinkTask, githubLink, title } = req.body;
        const usermail = req.user.email;
        const curruser = await LogInCollection.findOne({ email: usermail });
        const Tasks = await User.find({ taskTitle: githubLinkTask, name: curruser.name });

        Tasks.forEach(async (task) => {
            task.link.push(githubLink);
            await task.save();
        });

        const Taskss = await User.find({ name: curruser.name, projectTitle: title });
        res.render('user-task', { title, Taskss });

    } catch (error) {
        console.error("Error occurred during login:", error);
        res.status(500).send("Internal Server Error");
    }
};

exports.updateTaskStatus = async (req, res) => {
    try {
        const { taskTitle, description, projectTitle } = req.body;
        const usermail = req.user.email;
        const curruser = await LogInCollection.findOne({ email: usermail });
        const filter = { taskTitle: taskTitle, name: curruser.name, description: description };
        const update = { status: "Completed" };
        await User.findOneAndUpdate(filter, update);
        console.log("Update Done")
        const Taskss = await User.find({ name: curruser.name, projectTitle: projectTitle });
        const title = projectTitle;

        res.render('user-task', { title, Taskss });

    } catch (error) {
        console.error("Error occurred during login:", error);
        res.status(500).send("Internal Server Error");
    }
};


exports.createOrder = async (req, res) => {
    try {
        console.log("Inside create order")
        const { name, email, ld, project } = req.body;
        console.log(name);
        console.log(email);
        console.log(ld);
        console.log(project);
        try {
            const certification = await Certification.findOne({ name, email });

            if (!certification) {
                res.render('addDataforCertificate', { error: "No certification found with the provided name and email." });
            }

            certification.experiance = project;
            certification.share = ld;
            await certification.save();

        } catch (error) {
            console.error("Error updating certification:", error);
            res.status(500).send("Internal Server Error");
        }

        const { RAZORPAY_ID_KEY, RAZORPAY_SECRET_KEY } = process.env;

        const razorpayInstance = new Razorpay({
            key_id: RAZORPAY_ID_KEY,
            key_secret: RAZORPAY_SECRET_KEY
        });
        const amount = 9 * 100;

        const options = {
            amount: amount,
            currency: 'INR',
            receipt: 'manasreghe@gmail.com'
        }
        razorpayInstance.orders.create(options, (err, order) => {
            if (err) {
                console.error("Error creating Razorpay order:", err);
                return res.status(500).send({ success: false, msg: 'Error creating Razorpay order.' });
            } else {
                res.status(200).send({
                    success: true,
                    msg: 'Order Created',
                    order_id: order.id,
                    amount: amount,
                    key_id: RAZORPAY_ID_KEY,
                    product_name: "Internship Certificate",
                    description: "Internship Certificate",
                    contact: "1234567890",
                    name: "Bhushan Kadam",
                    email: "bhushankadam512@gmail.com"
                });
            }
        });



    } catch (error) {
        console.log(error);
        res.status(500).send('Internal Server Error');
    }
};


exports.paymentsuccess = async (req, res) => {
    try {
        const { planId } = req.body;
        const userEmail = req.user.email;
        console.log("Payment ID: " + planId);
        console.log("User Email: " + userEmail);
        const certification = await Certification.findOne({ email: userEmail });

        certification.PaymentID = planId;
        certification.payment = "Completed";

        await certification.save();
        res.render('addDataforCertificate', { message: "Certification form Submitted Secessfully. You can now Close the tab." });


    } catch (error) {
        console.log(error);
        res.status(500).send('Internal Server Error');
    }
};


exports.final_old = async (req, res) => {
    try {
        const userEmail = req.user.email;
        console.log("Inside Final");
        console.log("User Email:" + userEmail)
        const User = await LogInCollection.findOne({ email: userEmail });
        console.log(User.name);
        console.log(User.titile);
        const userOne = await Job.findOne({ jobTitle: User.titile });
        console.log(userOne.salary);
        const userTwo = await Certification.findOne({ email: userEmail });



        if (userTwo.payment === "Completed") {
            res.render('final', { name: User.name, jobTitle: User.titile, duration: userOne.salary });
        }
        else {
            res.render('index')
        }


    } catch (error) {
        console.log(error);
        res.status(500).send('Internal Server Error');
    }
};
exports.final = async (req, res) => {
    try {
        const userEmail = req.user.email;
        console.log("Inside Final");
        console.log("User Email:" + userEmail)
        const User = await LogInCollection.findOne({ email: userEmail });
        console.log(User.name);
        console.log(User.titile);
        const userOne = await Job.findOne({ jobTitle: User.titile });
        console.log(userOne.salary);
        const userTwo = await Certification.findOne({ email: userEmail });
        let today = new Date();
        let issued_on = new Date(today);
        console.log("issued_on:"+issued_on)
        const uuid = nanoid(8);
        console.log("Unique ID:"+uuid)



        if (userTwo.payment === "Completed") {
            res.render('final', { name: User.name, jobTitle: User.titile, duration: userOne.salary, issued_on, uuid });


            // sdk.auth(process.env.ACCESS_TOKEN);
            // sdk.createACredential({
            //     recipient: {
            //         name: User.name,
            //         email: userEmail,
            //         jobTitle: User.titile,
            //         duration: userOne.salary,
            //     },
            //     issueDate: issued_on,
            //     expiryDate: uuid,
            //     customAttributes: { 'custom.mentor': 'Jane Doe' },
            //     groupId: '01ht1v4qc6y676yy5d2mbzqmvh'
            // }, { 'certifier-version': '2022-10-26' })
            //     .then(({ data }) => console.log(data))
            //     .catch(err => console.error(err));
        }
        else {
            res.render('index')
        }


    } catch (error) {
        console.log(error);
        res.status(500).send('Internal Server Error');
    }
};


































//Admin Section

exports.adminlogin = async (req, res) => {
    try {
        console.log("enter in admi login")
        const { email, passward } = req.body;
        if (!email || !passward) {
            return res.status(400).render('adminlogin', { message: "Please enter email and passward" });
        }


        if (email === "admin@reff.com" && passward === "admin123") {
            console.log("Deatils Match")
            const token = jwt.sign({ email: email }, process.env.JWT_SECRET, { expiresIn: '30m' });

            console.log("The admin Token is " + token);
            const cookieOptions = {
                expires: new Date(
                    Date.now() +
                    process.env.JWT_COOKIE_EXPIRES * 24 * 60 * 60 * 1000
                ),
                httpOnly: true,
            };
            console.log("redirection")
            res.cookie("admin", token, cookieOptions);
            res.status(200).redirect("/home");

        } else {
            return res.status(401).render('adminlogin', { message: " Admin Email or Passward  incorrect" });
        }

    } catch (error) {
        console.log(error);
    }
};


exports.isAdminLoggedIn = async (req, res, next) => {
    const token = req.cookies.admin;
    if (!token) {
        return res.redirect("/adminlogin");
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.email = decoded.email;
        next();
    } catch (error) {
        console.error("Token verification error:", error);
        res.redirect("/adminlogin");
    }
};

exports.adminlogout = (req, res) => {
    res.clearCookie('admin');
    console.log("cookie clear");
    return res.render('adminlogin', {
        message: 'Admin Portal logout....'
    });

};

exports.addskills = async (req, res) => {
    try {
        const { skill } = req.body;
        console.log("Indise Add skill");
        console.log(skill);
        const existingskill = await skills.findOne({ skill });
        if (existingskill) {
            return res.render('add-skills', {
                message: 'Skill Already present..'
            });
        }
        else {

            try {
                await skills.create({ skill });
            } catch (error) {
                console.error("Error inserting data:", error);
            }

        }
        const allSkills = await skills.find();
        res.render('add-skills', { skills: allSkills });

    } catch (error) {
        console.error("Error occurred during login:", error);
        res.status(500).send("Internal Server Error login");
    }
};

exports.showskills = async (req, res) => {
    try {
        const allSkills = await skills.find();
        res.render('add-skills', { skills: allSkills });

    } catch (error) {
        console.error("Error occurred during login:", error);
        res.status(500).send("Internal Server Error login");
    }
};

exports.loadskills = async (req, res) => {
    try {
        const allSkills = await skills.find();
        res.render('add-jobs', { skills: allSkills });

    } catch (error) {
        console.error("Error occurred during login:", error);
        res.status(500).send("Internal Server Error login");
    }
};

exports.addjob = async (req, res) => {
    try {
        const { jobTitle, description, salary, selectedSkillsinput } = req.body;
        console.log("Received job title:", jobTitle);
        console.log("Received description:", description);
        console.log("Received salary:", salary);
        const trimmedSkillsString = selectedSkillsinput.trim();
        const skillsArray = trimmedSkillsString.split("×").map(skill => skill.trim());
        const finalSkillsArray = skillsArray.filter(skill => skill !== "").map(skill => skill.replace(",", ""));
        console.log("New Received selected skills:", finalSkillsArray);

        try {
            await Job.create({ jobTitle, description, salary, skills: finalSkillsArray });
            console.log("Insertion done")
            const applicantCollectionName = `applicants_${jobTitle}`;
            console.log("Collection Name:" + applicantCollectionName)
            createApplicantCollection(applicantCollectionName);
            console.log("New applicant collection craeted...")

            const allSkills = await skills.find();
            res.render('add-jobs', {
                message: 'Vacancy Added..',
                skills: allSkills
            });
        } catch (error) {
            res.render('add-jobs', {
                message: 'Something went wrong, Problem in jon addition....'
            });
            console.log("Problem in Insertion ")
            console.error("Error inserting data:", error);
        }


    } catch (error) {
        console.error("Error occurred during job addition:", error);
        res.status(500).send("Internal Server Error");
    }
};

exports.loadjobs = async (req, res) => {
    try {
        const jobPostings = await Job.find();
        res.render('jobs', { jobPostings });

    } catch (error) {
        console.error("Error occurred during login:", error);
        res.status(500).send("Internal Server Error job fetching");
    }
};

exports.loadjobs2 = async (req, res) => {
    try {
        const jobPostings = await Job.find();
        res.render('add-project', { jobPostings });

    } catch (error) {
        console.error("Error occurred during login:", error);
        res.status(500).send("Internal Server Error job fetching");
    }
};

exports.showapplication = async (req, res) => {
    try {
        console.log("You are inside show application ")

        let jobTitleInput = req.body.jobTitle;
        let duration = req.body.duration;
        let title = jobTitleInput.replace(/\s+/g, '').toLowerCase();
        let applicantCollectionName = `applicants_${title}`;

        applicantCollectionName = applicantCollectionName + "s"
        const collectionData = await fetchCollectionData(applicantCollectionName);
        res.render('applicant', { title: jobTitleInput, collectionData, duration });



    } catch (error) {
        console.error("Error:", error);
        res.status(500).send("Internal Server Error job fetching");
    }
};

exports.application = async (req, res) => {
    try {
        const { title, name, email, status, id, duration } = req.body;
        let jobTitleInput = title
        let title_new = jobTitleInput.replace(/\s+/g, '').toLowerCase();
        let applicantCollectionName = `applicants_${title_new}`;

        applicantCollectionName = applicantCollectionName + "s"
        console.log(applicantCollectionName)
        await updateDataToCollection(applicantCollectionName, name, status)
        const collectionData = await fetchCollectionData(applicantCollectionName);
        res.render('applicant', { title: jobTitleInput, collectionData });

        function getNextDayInterviewDate() {
            let currentDate = new Date();
            currentDate.setDate(currentDate.getDate() + 1);
            currentDate.setHours(11);
            currentDate.setMinutes(0);
            currentDate.setSeconds(0);
            currentDate.setMilliseconds(0);
            return currentDate;
        }


        if (status === "Interview") {
            nodemailer.createTestAccount((err, account) => {
                if (err) {
                    console.error('Failed to create a testing account. ' + err.message);
                    return process.exit(1);
                }

                console.log('Credentials obtained, sending message...');

                const transporter = nodemailer.createTransport({
                    host: 'smtp.gmail.com',
                    port: 465,
                    secure: true,
                    auth: {
                        user: 'bhushankadam512@gmail.com',
                        pass: process.env.gamil_pass
                    }
                });
                let interviewDate = getNextDayInterviewDate();

                let message = {
                    from: 'Admin <admin@reff.com>',
                    to: email,
                    subject: 'Interview Invitation',
                    text: 'Hello,',
                    html: `
                        <p>Dear ${name},</p>
                        <p>We are pleased to invite you to an interview for the position of ${title}.</p>
                        <p>The interview details are as follows:</p>
                        <ul>
                            <li><strong>Date:</strong> ${interviewDate.toDateString()}</li>
                            <li><strong>Time:</strong> ${interviewDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</li>
                            <li><strong>Planform: </strong>Google Meet</li>
                            <li><strong>Meeting Link:</strong> <a href="https://meet.google.com/kuc-vkpx-dhe">Join the Meeting</a></li>
                        </ul>
                        <p>Please let us know if this date and time works for you, or if you require any further information.</p>
                        <p>We look forward to meeting you!</p>
                        <p>Best regards,<br/>HR, Infotech</p>
                    `
                };

                transporter.sendMail(message, (err, info) => {
                    if (err) {
                        console.log('Error occurred. ' + err.message);
                        return process.exit(1);
                    }
                    else {
                        console.log("Mail sent...")
                    }
                });
            });
        }
        if (status === "Rejected") {
            nodemailer.createTestAccount((err, account) => {
                if (err) {
                    console.error('Failed to create a testing account. ' + err.message);
                    return process.exit(1);
                }

                console.log('Credentials obtained, sending mail...');

                const transporter = nodemailer.createTransport({
                    host: 'smtp.gmail.com',
                    port: 465,
                    secure: true,
                    auth: {
                        user: 'bhushankadam512@gmail.com',
                        pass: process.env.gamil_pass
                    }
                });
                let interviewDate = getNextDayInterviewDate();

                let message = {
                    from: 'Admin <admin@reff.com>',
                    to: email,
                    subject: 'Regarding Your Job Application',
                    text: 'Hello,',

                    html: `
                        <p>Dear ${name},</p>
                        <p>We regret to inform you that your application for the position of ${title} has been unsuccessful.</p>
                        <p>We appreciate the time and effort you put into the application process and want to thank you for your interest in our company.</p>
                        <p>Best wishes for your future endeavors.</p>
                        <p>Kind regards,<br/>HR, Infotech.</p>
                    `
                };

                transporter.sendMail(message, (err, info) => {
                    if (err) {
                        console.log('Error occurred. ' + err.message);
                        return process.exit(1);
                    }
                    else {
                        console.log("Mail sent...")
                    }
                });
            });
        }

        const url = process.env.BASE_URL;

        if (status === "Hired") {
            const pass = nanoid(6);
            console.log("Password is:" + pass);
            const hashedPassword = await bcrypt.hash(pass, 10);

            try {
                await LogInCollection.create({ name, email, password: hashedPassword, titile: title });
            } catch (error) {
                console.error("Error inserting data:", error);
            }
            try {
                // Convert .docx to HTML
                const { value: htmlContent } = await mammoth.convertToHtml({ path: 'Document/Test1.docx' });

                // Replace placeholders in HTML content
                // const replacedHtml = htmlContent.replace(/NAME/g, 'Bhushan'); // Example replacement
                const replacedHtml = htmlContent
                    .replace(/NAME/g, name)
                    .replace(/TITLE /g, title)
                    .replace(/TIME/g, duration);

                // Convert HTML to PDF
                htmlToPdf.create(replacedHtml).toBuffer(async (err, pdfBuffer) => {
                    if (err) {
                        console.error('Error converting HTML to PDF:', err);
                        return;
                    }

                    try {
                        // Send email with attachment
                        const transporter = nodemailer.createTransport({
                            host: 'smtp.gmail.com',
                            port: 465,
                            secure: true,
                            auth: {
                                user: 'bhushankadam512@gmail.com',
                                pass: process.env.gamil_pass
                            }
                        });
                        let interviewDate = getNextDayInterviewDate();
                        let today = new Date();

                        let startDate = new Date(today);
                        startDate.setDate(startDate.getDate() + 1);

                        let decisionDate = new Date(today);
                        decisionDate.setDate(decisionDate.getDate() + 2);

                        let formattedStartDate = startDate.toISOString().split('T')[0];
                        let formattedDecisionDate = decisionDate.toISOString().split('T')[0];

                        // Create message
                        const message = {
                            from: 'Admin <admin@reff.com>',
                            to: email,
                            subject: 'Job Offer from Infotech Ltd.',
                            text: 'Hello,',
                            html: `
                                <p>Dear ${name},</p>
                                <p>We are excited to extend to you a formal offer of employment from <strong>Infotech Ltd.</strong> for the position of ${title}. We believe that your skills and experience will make a significant contribution to our team.</p>  
                                <p>Here are the details of your offer:</p>
                                <ul>
                                    <li><strong>Position:</strong> ${title}</li>
                                    <li><strong>Start Date:</strong> ${formattedStartDate}</li>
                                    <li><strong>Decision Deadline:</strong> ${formattedDecisionDate}</li>
                                </ul>
                                <p>If you have any questions or need clarification on any aspect of the offer, please feel free to reach out to us.</p>
                                <p>If you choose to accept our offer, please sign the offer letter and return it to us via email by the decision deadline. We have also included your user login credentials below to facilitate your onboarding process:</p>
                                <ul>
                                    <li><strong>Website:</strong> ${url}</li>
                                    <li><strong>Username:</strong> ${email}</li>
                                    <li><strong>Password:</strong> ${pass}</li>
                                </ul>
                                <p>If you have any concerns or require any accommodations to facilitate your transition to Infotech Ltd., please let us know, and we will do our best to accommodate your needs.</p>
                                <p>We are thrilled at the opportunity to work with you and look forward to your favorable response. Welcome to the team!</p>
                                <p>Best regards,</p>
                                <p>Additionally, we encourage you to share this internship offer letter on LinkedIn to showcase your professional growth and accomplishments. You may also submit this letter to your college for verification purposes. Our team is always available to assist you throughout your internship journey. Should you require any support or guidance, please do not hesitate to reach out to us. We are committed to ensuring that your internship experience with us is enriching and rewarding.</p>
                                <p>HR, Infotech Ltd.</p>
                            `,
                            attachments: [{
                                filename: 'Offer Letter.pdf',
                                content: pdfBuffer,
                                contentType: 'application/pdf',
                            }]
                        };

                        const info = await transporter.sendMail(message);
                        console.log('Message sent: %s', info.messageId);
                    } catch (error) {
                        console.error('Error sending email:', error);
                    }
                });
            } catch (error) {
                console.error("Error generating PDF:", error);
            }

        }

    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error in application");
    }
};


exports.hireAll = async (req, res) => {
    try {
        console.log("inside hire all")
        const { title, duration } = req.body;
        console.log(title);
        console.log("Duration:" + duration);
        let jobTitleInput = title
        let title_new = jobTitleInput.replace(/\s+/g, '').toLowerCase();
        let applicantCollectionName = `applicants_${title_new}`;

        applicantCollectionName = applicantCollectionName + "s"
        console.log(applicantCollectionName)
        const url = process.env.BASE_URL;
        const pendingApplications = await fetchCollectionDatawithStatus(applicantCollectionName, "Pending");


        pendingApplications.forEach(async (applicant) => {
            const { name, email } = applicant;

            const pass = nanoid(6);
            console.log("Password is: " + pass);

            const hashedPassword = await bcrypt.hash(pass, 10);

            try {
                await LogInCollection.create({ name, email, password: hashedPassword, titile: title });
            } catch (error) {
                console.error("Error inserting data:", error);
            }

            try {
                const { value: htmlContent } = await mammoth.convertToHtml({ path: 'Document/Test1.docx' });

                const replacedHtml = htmlContent
                    .replace(/NAME/g, name)
                    .replace(/TITLE/g, title)
                    .replace(/TIME/g, duration);

                htmlToPdf.create(replacedHtml).toBuffer(async (err, pdfBuffer) => {
                    if (err) {
                        console.error('Error converting HTML to PDF:', err);
                        return;
                    }

                    try {
                        const transporter = nodemailer.createTransport({
                            host: 'smtp.gmail.com',
                            port: 465,
                            secure: true,
                            auth: {
                                user: 'bhushankadam512@gmail.com',
                                pass: process.env.gamil_pass
                            }
                        });

                        let today = new Date();
                        let startDate = new Date(today);
                        startDate.setDate(startDate.getDate() + 1);
                        let decisionDate = new Date(today);
                        decisionDate.setDate(decisionDate.getDate() + 2);
                        let formattedStartDate = startDate.toISOString().split('T')[0];
                        let formattedDecisionDate = decisionDate.toISOString().split('T')[0];

                        // Create message
                        const message = {
                            from: 'Admin <admin@reff.com>',
                            to: email,
                            subject: 'Job Offer from Infotech Ltd.',
                            text: 'Hello,',
                            html: `
                                <p>Dear ${name},</p>
                                <p>We are excited to extend to you a formal offer of employment from <strong>Infotech Ltd.</strong> for the position of ${title}. We believe that your skills and experience will make a significant contribution to our team.</p>  
                                <p>Here are the details of your offer:</p>
                                <ul>
                                    <li><strong>Position:</strong> ${title}</li>
                                    <li><strong>Start Date:</strong> ${formattedStartDate}</li>
                                    <li><strong>Decision Deadline:</strong> ${formattedDecisionDate}</li>
                                </ul>
                                <p>If you have any questions or need clarification on any aspect of the offer, please feel free to reach out to us.</p>
                                <p>If you choose to accept our offer, please sign the offer letter and return it to us via email by the decision deadline. We have also included your user login credentials below to facilitate your onboarding process:</p>
                                <ul>
                                    <li><strong>Website:</strong> ${url}</li>
                                    <li><strong>Username:</strong> ${email}</li>
                                    <li><strong>Password:</strong> ${pass}</li>
                                </ul>
                                <p>If you have any concerns or require any accommodations to facilitate your transition to Infotech Ltd., please let us know, and we will do our best to accommodate your needs.</p>
                                <p>We are thrilled at the opportunity to work with you and look forward to your favorable response. Welcome to the team!</p>
                                <p>Best regards,</p>
                                <p>Additionally, we encourage you to share this internship offer letter on LinkedIn to showcase your professional growth and accomplishments. You may also submit this letter to your college for verification purposes. Our team is always available to assist you throughout your internship journey. Should you require any support or guidance, please do not hesitate to reach out to us. We are committed to ensuring that your internship experience with us is enriching and rewarding.</p>
                                <p>HR, Infotech Ltd.</p>
                            `, // Your HTML content here
                            attachments: [{
                                filename: 'Offer Letter.pdf',
                                content: pdfBuffer,
                                contentType: 'application/pdf',
                            }]
                        };

                        // Send email
                        const info = await transporter.sendMail(message);
                        console.log('Message sent: %s', info.messageId);
                    } catch (error) {
                        console.error('Error sending email:', error);
                    }
                });
            } catch (error) {
                console.error("Error generating PDF:", error);
            }
        });

        const collectionData = await fetchCollectionData(applicantCollectionName);
        res.render('applicant', { title: jobTitleInput, collectionData, duration });


    } catch (error) {
        console.error("Error:", error);
        res.status(500).send("Internal Server Error job fetching");
    }
};



exports.loademp = async (req, res) => {
    try {
        const { jobPosting } = req.body;
        const foundcand = await LogInCollection.find({ titile: jobPosting });
        console.log(foundcand)
        res.render('add-project2', { foundcand });

    } catch (error) {
        console.error("Error:", error);
        res.status(500).send("Internal Server Error job fetching");
    }
};


exports.addproject = async (req, res) => {
    try {
        const { projectTitle, description, selectedcand } = req.body;
        console.log("Received title:", projectTitle);
        console.log("Received description:", description);
        const trimmedSkillsString = selectedcand.trim();
        const skillsArray = trimmedSkillsString.split("×").map(skill => skill.trim());
        const finalSkillsArray = skillsArray.filter(skill => skill !== "").map(skill => skill.replace(",", ""));
        console.log("New Received selected candidate:", finalSkillsArray);

        let project = await Project.findOne({ title: projectTitle });

        if (!project) {
            project = new Project({
                title: projectTitle,
                description: description
            });
            await project.save();
            console.log('New project created');
        } else {
            console.log('Project already exists');
        }

        const candidateIds = [];
        for (let candidateTitle of finalSkillsArray) {
            candidateTitle = candidateTitle.trim();
            const candidate = await LogInCollection.findOne({ name: candidateTitle });
            if (candidate) {
                candidateIds.push(candidate._id);
            } else {
                console.log(`Candidate '${candidateTitle}' not found`);
            }
        }

        project.tasks = [...project.tasks, ...candidateIds];

        await project.save();

        console.log('Candidates added to project successfully');
        res.render('add-project2', { message: "New Project Created" });



    } catch (error) {
        console.error("Error occurred during job addition:", error);
        res.status(500).send("Internal Server Error");
    }
};

exports.showprojects = async (req, res) => {
    try {
        const projects = await Project.find();

        const projectsWithCandidates = await Promise.all(projects.map(async (project) => {
            const candidates = [];

            await Promise.all(project.tasks.map(async (candidateId) => {
                const candidate = await LogInCollection.findById(candidateId);
                const candidateName = candidate ? candidate.name : 'Unknown';
                candidates.push(candidateName);
            }));

            return {
                ...project.toObject(),
                candidates
            };
        }));

        res.render('showprojects', { projectsWithCandidates });


    } catch (error) {
        console.error("Error:", error);
        res.status(500).send("Internal Server Error job fetching");
    }
};



exports.showinfofortask = async (req, res) => {
    try {
        let { title, candidates } = req.body;
        const candidatesArray = candidates.split(',');

        const projects = await Project.find({ title: title });
        const projectsWithCandidates = await Promise.all(projects.map(async (project) => {
            const candidates = [];

            await Promise.all(project.tasks.map(async (candidateId) => {
                const candidate = await LogInCollection.findById(candidateId);
                const candidateName = candidate ? candidate.name : 'Unknown';
                candidates.push(candidateName);
            }));

            return {
                ...project.toObject(),
                candidates
            };
        }));



        res.render('add-task', { title, projectsWithCandidates });

    } catch (error) {
        console.error("Error:", error);
        res.status(500).send("Internal Server Error");
    }
};



exports.addtask = async (req, res) => {
    try {
        let { title, description, taskTitle, selectedSkills2 } = req.body;
        const trimmedSkillsString = selectedSkills2.trim();
        const skillsArray = trimmedSkillsString.split("×").map(skill => skill.trim());
        const finalSkillsArray = skillsArray.filter(skill => skill !== "").map(skill => skill.replace(",", ""));
        const trimmedCandidates = finalSkillsArray.map(candidate => candidate.trim());

        console.log("Project Title:" + title);
        console.log("Task Title:" + taskTitle);
        console.log("Description:" + description);
        console.log("New Received selected candidate:", trimmedCandidates);

        //saving data in Task collection
        const newTask = new Task({
            projectTitle: title,
            title: taskTitle,
            description: description,
            assignedTo: trimmedCandidates,
            status: 'pending'
        });

        newTask.save()
            .then(savedTask => {
            })
            .catch(error => {
                console.error('Error saving task:', error);
            })


        for (const user of trimmedCandidates) {
            console.log(user);
            const newUserTask = new User({
                name: user,
                projectTitle: title,
                taskTitle: taskTitle,
                description: description,
            });

            newUserTask.save()
            .then(newUserTask => {
                console.log("User saveddddd")
            })
            .catch(error => {
                console.error('Error saving user:', error);
            })

            console.log(`UserTask created for ${user}`);
        }


        const projects = await Project.find();

        const projectsWithCandidates = await Promise.all(projects.map(async (project) => {
            const candidates = [];

            await Promise.all(project.tasks.map(async (candidateId) => {
                const candidate = await LogInCollection.findById(candidateId);
                const candidateName = candidate ? candidate.name : 'Unknown';
                candidates.push(candidateName);
            }));

            return {
                ...project.toObject(),
                candidates
            };
        }));

        res.render('showprojects', { projectsWithCandidates });
    } catch (error) {
        console.error("Error:", error);
        res.status(500).send("Internal Server Error");
    }
};


exports.showtask = async (req, res) => {
    try {
        const { title } = req.body;
        const foundTask = await Task.find({ projectTitle: title });
        res.render('task', { projectTitle: title, foundTask });

    } catch (error) {
        console.error("Error:", error);
        res.status(500).send("Internal Server Error job fetching");
    }
};

exports.showprogress = async (req, res) => {
    try {
        const { projectTitle, title } = req.body;
        console.log("Task title: " + title)
        console.log("Project title: " + projectTitle)
        const foundTask = await User.find({ projectTitle, taskTitle: title });
        const description = foundTask[0].description;
        res.render('task-progress', { title: title, description, foundTask });

    } catch (error) {
        console.error("Error:", error);
        res.status(500).send("Internal Server Error job fetching");
    }
};


exports.addcomment = async (req, res) => {
    try {
        const { githubLink, title1, markPending, assignedPerson, taskDescription } = req.body;
        const filter = { taskTitle: title1, name: assignedPerson, description: taskDescription };
        let update = {};

        if (markPending === "on") {
            update = {
                status: "Pending",
                $push: {
                    comment: {
                        text: githubLink,
                        date: new Date()
                    }
                }
            };
        } else {
            update = {
                $push: {
                    comment: {
                        text: githubLink,
                        date: new Date()
                    }
                }
            };
        }

        const user = await User.findOne(filter);

        if (user) {
            await User.findOneAndUpdate(filter, update);
        } else {
            console.log('User not found');
        }


        const foundTask = await User.find({ projectTitle: user.projectTitle, taskTitle: title1 });
        const description = foundTask[0].description;
        res.render('task-progress', { title: title1, description, foundTask });


    } catch (error) {
        console.error("Error:", error);
        res.status(500).send("Internal Server Error job fetching");
    }
};



exports.closetask = async (req, res) => {
    try {
        const { projectTitle, title } = req.body;
        const filter = { projectTitle: projectTitle, title: title };
        const update = { status: "Completed" };
        await Task.findOneAndUpdate(filter, update);
        const foundTask = await Task.find({ projectTitle: projectTitle });
        res.render('task', { projectTitle: projectTitle, foundTask });

    } catch (error) {
        console.error("Error:", error);
        res.status(500).send("Internal Server Error job fetching");
    }
};

exports.admindash = async (req, res) => {
    try {
        const totalProject = await Project.countDocuments();
        const totalTask = await Task.countDocuments();
        const totalPendingTask = await Task.countDocuments({ status: "pending" });
        const totalCompletedTask = totalTask - totalPendingTask;
        const totalJob = await Job.countDocuments();
        const totalSkillsPosted = await skills.countDocuments();
        const totalCandidateHire = await LogInCollection.countDocuments();

        res.render('home', {
            totalProject: totalProject,
            totalTask: totalTask,
            totalPendingTask: totalPendingTask,
            totalCompletedTask: totalCompletedTask,
            totalJob: totalJob,
            totalSkillsPosted: totalSkillsPosted,
            totalCandidateHire: totalCandidateHire
        });



    } catch (error) {
        console.error("Error:", error);
        res.status(500).send("Internal Server Error job fetching");
    }
};


exports.end = async (req, res) => {
    try {
        const tasks = await User.find();
        let candidateTaskData = {};

        tasks.forEach(task => {
            const { name, status } = task;

            if (!candidateTaskData[name]) {
                candidateTaskData[name] = {
                    totalTasks: 0,
                    pendingTasks: 0,
                    completedTasks: 0,
                    completionPercentage: 0,
                    userData: {}
                };
            }

            candidateTaskData[name].totalTasks++;

            if (status === 'Pending') {
                candidateTaskData[name].pendingTasks++;
            } else if (status === 'Completed') {
                candidateTaskData[name].completedTasks++;
            }

        });
        for (const candidateName of Object.keys(candidateTaskData)) {
            try {
                const user = await LogInCollection.findOne({ name: candidateName });

                if (user) {
                    candidateTaskData[candidateName].userData.email = user.email;
                    candidateTaskData[candidateName].userData.title = user.titile;
                }
                const { completedTasks, totalTasks } = candidateTaskData[candidateName];
                if (totalTasks > 0) {
                    const completionPercentage = Math.round((completedTasks / totalTasks) * 100);
                    candidateTaskData[candidateName].completionPercentage = completionPercentage;
                }
            } catch (error) {
                console.error(`Error fetching user data for ${candidateName}: ${error.message}`);
            }
        }

        const jsonData = JSON.stringify(candidateTaskData, null, 2);

        console.log(jsonData);
        res.render('end', { candidateTaskData });

    } catch (error) {
        console.error("Error:", error);
        res.status(500).send("Internal Server Error job fetching");
    }
};

exports.addDataforCertificate = async (req, res) => {
    try {
        console.log("Inside Certificate");
        const { name, email, title } = req.body;
        console.log(name);
        console.log(email);
        console.log(title);
        const newCertification = new Certification({
            name: name,
            email: email,
            role: title
        });
        let url = process.env.BASE_URL
        const frmlink = url + "/addDataforCertificate";
        console.log("url:" + frmlink)

        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 465,
            secure: true,
            auth: {
                user: 'bhushankadam512@gmail.com',
                pass: process.env.gamil_pass
            }
        });

        const message = {
            from: 'Infotech <admin@reff.com>',
            to: email,
            subject: 'Congratulations on Completing Your Internship with Infotech',
            text: 'Hello,',
            html: `
                <p>Dear ${name},</p>
                <p>Congratulations on successfully completing your internship with Infotech! We are delighted to acknowledge your dedication and hard work.</p>
                <p>To proceed with your certification, please fill in the details through the following link:</p>
                <p><a href="${frmlink}">Fill Details</a></p>
                <p>As part of our process, we kindly request you to share your internship project on LinkedIn. Here is the link to share:</p>
                <p><a href="https://linkedin.com/share-project" target="_blank">Share Project on LinkedIn</a> (Compulsory Before Filling the form)</p>
                <p>Please note that there is a processing fee of INR 99 for the certification.</p>
                <p>Once your payment is confirmed, your certification will be processed.</p>
                <p>Thank you once again for your contribution to Infotech. We wish you all the best for your future endeavors.</p>
                <p>Best regards,<br/>HR Team, Infotech</p>
            `
        };


        transporter.sendMail(message, (err, info) => {
            if (err) {
                console.log('Error occurred. ' + err.message);
                return process.exit(1);
            }
            else {
                console.log("Mail sent...")
            }
        });

        newCertification.save()
            .then(savedCertification => {
                console.log("Certification saved successfully:");
            })
            .catch(error => {
                console.error("Error saving certification:", error);
            });

        const tasks = await User.find();
        let candidateTaskData = {};

        tasks.forEach(task => {
            const { name, status } = task;

            if (!candidateTaskData[name]) {
                candidateTaskData[name] = {
                    totalTasks: 0,
                    pendingTasks: 0,
                    completedTasks: 0,
                    completionPercentage: 0,
                    userData: {}
                };
            }

            candidateTaskData[name].totalTasks++;

            if (status === 'Pending') {
                candidateTaskData[name].pendingTasks++;
            } else if (status === 'Completed') {
                candidateTaskData[name].completedTasks++;
            }

        });
        for (const candidateName of Object.keys(candidateTaskData)) {
            try {
                const user = await LogInCollection.findOne({ name: candidateName });

                if (user) {
                    candidateTaskData[candidateName].userData.email = user.email;
                    candidateTaskData[candidateName].userData.title = user.titile;
                }
                const { completedTasks, totalTasks } = candidateTaskData[candidateName];
                if (totalTasks > 0) {
                    const completionPercentage = Math.round((completedTasks / totalTasks) * 100);
                    candidateTaskData[candidateName].completionPercentage = completionPercentage;
                }
            } catch (error) {
                console.error(`Error fetching user data for ${candidateName}: ${error.message}`);
            }
        }

        const jsonData = JSON.stringify(candidateTaskData, null, 2);

        console.log(jsonData);
        res.render('end', { candidateTaskData });




    } catch (error) {
        console.error("Error:", error);
        res.status(500).send("Internal Server Error job fetching");
    }
};

exports.certification = async (req, res) => {
    try {
        const users = await Certification.find();
        res.render('certification', { users });



    } catch (error) {
        console.error("Error:", error);
        res.status(500).send("Internal Server Error job fetching");
    }
};




