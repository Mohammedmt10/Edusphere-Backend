import mongoose, { Types } from "mongoose";
import dotenv from "dotenv";
dotenv.config();

  mongoose.connect(process.env.MONGO_URL||'')

 interface IUser {
  username: string;
  password: string;
}

 interface IAdmin extends Document {
  username: string;
  password: string;
}

 interface ICourse extends Document {
  title: string;
  description: string;
  price: number;
  imageUrl: string;
  userId: mongoose.Types.ObjectId;
}

 interface IPurchasedCourse extends Document {
  userId: Types.ObjectId;
  courseId: Types.ObjectId;
}

 interface ILecture extends Document {
  courseId: Types.ObjectId;
  title: string;
  date: Date;
  duration: string;
}


const userSchema = new mongoose.Schema<IUser>({
    username : {type : String , unique : true , required : true},
    password : {type : String , required : true}
})

const adminSchema = new mongoose.Schema<IAdmin>({
    username : {type : String , unique : true , require : true},
    password : {type : String ,  require : true}
})

const courseSchema = new mongoose.Schema({
    title : String,
    description : String,
    price : Number,
    imageUrl : String,
    userId : {type : mongoose.Types.ObjectId , ref : 'admin' }
});

const purchasedCourseSchema = new mongoose.Schema({
    userId :{ type : mongoose.Types.ObjectId , ref : 'users' },
    courseId : {type : mongoose.Types.ObjectId , ref : 'courses'}
});

const lectureSchema = new mongoose.Schema({
    title : String,
    videoUrl : String,
    courseId : {type : mongoose.Types.ObjectId , ref : 'courses'}
} , {
  timestamps : true
})

export const lectureModel = mongoose.model('lecture' , lectureSchema);
export const userModel = mongoose.model<IUser>('users' , userSchema);
export const adminModel = mongoose.model<IAdmin>('admin' , adminSchema)
export const courseModel = mongoose.model<ICourse>('courses' , courseSchema);
export const purchasedCourseModel = mongoose.model('purchasedCourse' , purchasedCourseSchema)