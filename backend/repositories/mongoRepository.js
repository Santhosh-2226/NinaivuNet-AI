const User = require("../models/User");
const Project = require("../models/Project");
const ProjectMember = require("../models/ProjectMember");
const Department = require("../models/Department");
const Organization = require("../models/Organization");
const Invitation = require("../models/Invitation");
const Notification = require("../models/Notification");
const ScheduledMeeting = require("../models/ScheduledMeeting");

module.exports = {
  // User Operations
  findUserByEmail: (email) => User.findOne({ email }).select("+password"),
  findUserById: (id) => User.findById(id),
  createUser: (data) => User.create(data),
  updateUserById: (id, data) => User.findByIdAndUpdate(id, data, { new: true, runValidators: true }),

  // Project Operations
  findProjectById: (id) => Project.findById(id),
  createProject: (data) => Project.create(data),
  findProjects: (query) => Project.find(query).populate("department"),

  // ProjectMember Operations
  findMembers: (query) => ProjectMember.find(query).populate("user"),
  findMember: (query) => ProjectMember.findOne(query),
  createMember: (data) => ProjectMember.create(data),
  deleteMember: (query) => ProjectMember.deleteOne(query),

  // Invitation Operations
  findInvitation: (query) => Invitation.findOne(query),
  createInvitation: (data) => Invitation.create(data),
  updateInvitationStatus: (id, status) => Invitation.findByIdAndUpdate(id, { status }, { new: true }),

  // Department Operations
  findDepartments: (query) => Department.find(query),
  createDepartment: (data) => Department.create(data),

  // Organization Operations
  findOrganizations: (query) => Organization.find(query),
  createOrganization: (data) => Organization.create(data),

  // Notification Operations
  findNotifications: (query) => Notification.find(query).sort({ createdAt: -1 }),
  createNotification: (data) => Notification.create(data),
  markNotificationsAsRead: (userId) => Notification.updateMany({ recipient: userId }, { read: true }),

  // ScheduledMeeting Operations
  findScheduledMeetings: (query) => ScheduledMeeting.find(query),
  createScheduledMeeting: (data) => ScheduledMeeting.create(data)
};
