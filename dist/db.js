"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.purchasedCourseModel = exports.courseModel = exports.adminModel = exports.userModel = exports.lectureModel = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
mongoose_1.default.connect(process.env.MONGO_URL || '');
const userSchema = new mongoose_1.default.Schema({
    username: { type: String, unique: true, required: true },
    password: { type: String, required: true }
});
const adminSchema = new mongoose_1.default.Schema({
    username: { type: String, unique: true, require: true },
    password: { type: String, require: true }
});
const courseSchema = new mongoose_1.default.Schema({
    title: String,
    description: String,
    price: Number,
    imageUrl: String,
    userId: { type: mongoose_1.default.Types.ObjectId, ref: 'admin' }
});
const purchasedCourseSchema = new mongoose_1.default.Schema({
    userId: { type: mongoose_1.default.Types.ObjectId, ref: 'users' },
    courseId: { type: mongoose_1.default.Types.ObjectId, ref: 'courses' }
});
const lectureSchema = new mongoose_1.default.Schema({
    title: String,
    videoUrl: String,
    courseId: { type: mongoose_1.default.Types.ObjectId, ref: 'courses' }
}, {
    timestamps: true
});
exports.lectureModel = mongoose_1.default.model('lecture', lectureSchema);
exports.userModel = mongoose_1.default.model('users', userSchema);
exports.adminModel = mongoose_1.default.model('admin', adminSchema);
exports.courseModel = mongoose_1.default.model('courses', courseSchema);
exports.purchasedCourseModel = mongoose_1.default.model('purchasedCourse', purchasedCourseSchema);
