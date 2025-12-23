import express from 'express'
import {z} from 'zod';
import { adminModel , courseModel, purchasedCourseModel, userModel } from './db';
import bcrypt from 'bcrypt';
import cors from 'cors'
import jwt from 'jsonwebtoken';
import { secret } from './config';
import { authMiddleware } from './middleware';
import dotenv from "dotenv";
import { lectureModel } from './db';
import axios from 'axios';
import Stripe from 'stripe';

const port = 3000;
const app = express();

dotenv.config();
app.use(cors());
const stripe = new Stripe(process.env.STRIPE_API_KEY || '');
app.use(express.json());

app.post('/payment', authMiddleware , async (req , res) => {

    const courseTitle = req.body.title;
    const price = req.body.price;
    const courseId = req.body.courseId;

try{
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
    line_items: [
  {
    price_data: {
      currency: "usd",
      product_data: {
        name: courseTitle,
      },
      unit_amount: price, // amount in cents (e.g., $10 = 1000)
    },
    quantity: 1,
  }
],
    
    mode: 'payment',
    success_url: `https://edusphere-sandy.vercel.app/paymentSuccessfull/{CHECKOUT_SESSION_ID}/${courseId}`,
    cancel_url: 'https://edusphere-sandy.vercel.app/',
    });

    return res.json({url : session.url});
}catch (e) {
    return res.status(500).json({
        message : e
    })
}
})

app.get('/verifyPayment', async (req , res) => {
    const sessionId = req.query.session_id as string

    if(!sessionId) return res.json({
        message : 'no session id provided'
    });

    try {
        const session = await stripe.checkout.sessions.retrieve(sessionId);

        return res.json({
            paymentStatus : session.payment_status,

        });
    } catch (e) {
        return res.json({
            error : e
        })
    }

})

app.post('/test' , async (req , res) => {
    
    const code = req.body.code;
    const sendCode = `function output() {
        ${code}
    }
    output();    
    `

const options = {
  method: 'POST',
  url: 'https://judge0-ce.p.rapidapi.com/submissions',
  params: {
    base64_encoded: 'true',
    wait: 'false',
    fields: '*'
  },
  headers: {
    'x-rapidapi-key': 'f811e3ef1cmshbb7db1e85e1468ap14c5e1jsnd83ddcd6c803',
    'x-rapidapi-host': 'judge0-ce.p.rapidapi.com',
    'Content-Type': 'application/json'
  },
  data: JSON.stringify({
    language_id: 93,
    source_code: btoa(sendCode),
    //stdin: 'SnVkZ2Uw'
  })
};

	try {
		const response = await axios.request(options);
		const data = response.data.token;

        return res.json({
            token : data
        })

	} catch (error) {
		console.error(error);
	}
});

app.get('/getOutput' , async (req , res) => {
    const token = req.headers['authorization'];
    const url = `https://judge0-ce.p.rapidapi.com/submissions/${token}?base64_encoded=true&fields=*`;
const options = {
	method: 'GET',
	headers: {
		'x-rapidapi-key': 'f811e3ef1cmshbb7db1e85e1468ap14c5e1jsnd83ddcd6c803',
		'x-rapidapi-host': 'judge0-ce.p.rapidapi.com'
	}
};

try {
	let statuscode = 2;
    let result;
    while(statuscode == 2){
        const response = await fetch(url, options);
        result = await response.json();
        statuscode = result.status_id;
    }
    return res.json({
        result
    })
} catch (error) {
	console.error({error});
    return res.json({
        error
    })
}
})

app.post('/signup' , async (req , res , next) => {
    const body = z.object({
        username: z.string().min(3).max(30),
        password : z.string().min(3).max(30).regex(/^(?=.*[!@#$%^&*(),.?":{}|<>])(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9]).*$/)
    });
    
    const safeParsed = body.safeParse(req.body);

    if(safeParsed.success) {
        const user = safeParsed.data;

        try{
            const sameUser = await userModel.findOne({username : user.username});

            if(sameUser) {
                return res.json({
                    message : 'user already exist'
                })
            }

            const hashedpassword = await bcrypt.hash(user.password , 5);

            const newUser = await userModel.create({
                username : user.username,
                password : hashedpassword
            });

            return res.json({
                message : 'new user created'
            })

        } catch(e) {
            return res.json({
                message : 'some error',
                error : e
            })
        }
    } else {
        return res.json({
            error : safeParsed.error.issues[0].path[0],
            message : 'not passed safely'
        })
    }
});

app.post('/signin' , async (req : Request , res : any) => {
    const requiredBody = z.object({
        username : z.string().max(30).min(3),
        password : z.string().max(30).min(3).regex(/^(?=.*[!@#$%^&*(),.?":{}|<>])(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9]).*$/)
    });
    
    const safeParsed = requiredBody.safeParse(req.body);
    
    if(safeParsed.success) {
        const userData = safeParsed.data;
        try{
        const user = await userModel.findOne({
            username : userData.username
        });
        if (!user) {
            return res.json({ message: "no user found" });
        }
        
        if(user.password) {
            const passwordVerification = await bcrypt.compare(userData.password , user.password);
            if(passwordVerification) {
                const token = jwt.sign({
                    _id : user._id
                } , secret , {expiresIn : '24hr'});
                return res.json({  
                    token : token
                })
            } else {
                return res.json({
                    message : 'incorrect creds'
                })
            }
        } else {
            return res.json({
                message : "no user found"
            })
        }
    } catch (e) {
        return res.json({
            error : e
        })
    }
    } else {
        return res.json({
            message : "some error"
        })
    }
})

app.post('/adminsignup' , async (req , res , next) => {
    const body = z.object({
        username: z.string().min(3).max(30),
        password : z.string().min(3).max(30).regex(/^(?=.*[!@#$%^&*(),.?":{}|<>])(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9]).*$/)
    });
    
    const safeParsed = body.safeParse(req.body);

    if(safeParsed.success) {
        const user = safeParsed.data;

        try{
            const sameUser = await adminModel.findOne({username : user.username});

            if(sameUser) {
                return res.json({
                    message : 'admin already exist'
                })
            }

            const hashedpassword = await bcrypt.hash(user.password , 5);

            const newUser = await adminModel.create({
                username : user.username,
                password : hashedpassword
            });

            return res.json({
                message : 'new admin created'
            })

        } catch(e) {
            return res.json({
                message : 'some error',
                error : e
            })
        }
    } else {
        return res.json({
            error : safeParsed.error.issues[0].path[0],
            message : 'not passed safely'
        })
    }
});

app.post('/adminsignin' , async (req , res , next) => {
    const requiredBody = z.object({
        username : z.string().max(30).min(3),
        password : z.string().max(30).min(3).regex(/^(?=.*[!@#$%^&*(),.?":{}|<>])(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9]).*$/)
    });

    const safeParsed = requiredBody.safeParse(req.body);

    if(safeParsed.success) {
        const userData = safeParsed.data;
        const user = await adminModel.findOne({
            username : userData.username
        })
        if(user?.password) {
            const passwordVerification = await bcrypt.compare(userData.password , user.password);
            if(passwordVerification) {
                const token = jwt.sign({
                    _id : user._id
                } , secret , {expiresIn : '24hr'});
                return res.json({  
                    token : token
                })
            } else {
                return res.json({
                    message : 'incorrect creds'
                })
            }
        } else {
            return res.json({
                message : "no user found"
            })
        }
    } else {
        return res.json({
            message : "some error"
        })
    }
})


app.get('/me' , authMiddleware ,  async (req , res ) => {
    //@ts-ignore
    const userId = req.userId;

    const user = await userModel.findOne({
        _id : userId
    })

    return res.json({user})
})

app.get('/adminMe', authMiddleware , async (req , res ) => {
    //@ts-ignore
    const userId = req.userId;
    try{
        const user = await adminModel.findOne({
            _id : userId
        });
        if(user == null) {
            return res.json({
                message : 'user not found'
            });
        }
        return res.json({user})
    } catch (e) {
        return res.json({
            message : 'some error'
        })
    }

})

app.post('/createCourse' , authMiddleware  , async (req , res) => {
    //@ts-ignore
    const userId = req.userId;
    if(!userId) {
        return res.json({
            message : "admin not logged in"
        })
    }
    const requiredBody = z.object({
        title : z.string().min(3),
        description : z.string(),
        price : z.number(),
        imageUrl : z.string()
    });

    const safeParsed = requiredBody.safeParse(req.body);

    if(safeParsed.success) {
        const data = safeParsed.data
        const response = await courseModel.findOne({
            userId : userId,
            title : data.title
        })
        if(response) {
            return res.json({
                message : "course already exist"
            })
        }else {
            const newCourse = await courseModel.create({
                title : data.title,
                description : data.description,
                price : data.price,
                imageUrl : data.imageUrl,
                userId : userId
            });
            if(newCourse) {
                
                return res.json({
                    _id : newCourse._id,
                    message : 'course created'
                })
            }
            return res.json({
                message : 'something went wrong'
            })

        }

        
    } else {
        return res.json({
            message : 'invalid input'
        })
    }

});

app.get('/purchasedCourses' , authMiddleware , async (req , res) => {
    //@ts-ignore
    const userId = req.userId;

    const response = await purchasedCourseModel.find({
        userId : userId
    }).populate([{
        path : 'courseId'
    }, {
        path : 'userId'
    }])

    if(response == null) {
        return res.json({
            message : 'no course purchased'
        })
    }

    return res.json({
        message : response
    })
})

app.post('/buy' , authMiddleware , async (req , res ) => {
   //@ts-ignore
    const userId = req.userId;
    const courseId = req.body.courseId;

    if(userId == null) {
        return res.json({
            message : 'user is not logged in'
        })
    }

    const response = await purchasedCourseModel.findOne({
        userId : userId,
        courseId : courseId
    })
    
    if(response) {
        return res.json({
            message : 'already purchased'
        });
        return;
    }

    const purchase = await purchasedCourseModel.create({
        userId : userId,
        courseId : courseId
    })

    if(purchase) {
        return res.json({
            message : "purchased"
        })
    }
})

app.get('/courses' , async (req , res) => {
    const courses = await courseModel.find({}).populate('userId');

    return res.json({
        courses : courses
    })
})

app.get('/course/:id', async (req , res) => {
    const courseId = req.params['id'];

    const response = await courseModel.findOne({
        _id : courseId
    })
    
    return res.json({
        response
    })
});

app.post('/addLecture/:id', async (req , res) => {
    const requiredBody = z.object({
        title : z.string(),
        videoUrl : z.string()
    });

    const courseId = req.params['id']

    const safeParsed = requiredBody.safeParse(req.body);

    const data = safeParsed.data

    if(safeParsed.success) {
        try{
            const response = await lectureModel.create({
                title : data?.title,
                videoUrl : data?.videoUrl,
                courseId : courseId
            });
            if(response) {
                return res.json({
                    message : 'lecture has been created'
                })
            } else {
                return res.json({
                    message : "lecture not created"
                });
            }
        } catch(e) {
            return res.json({message : 'some error ocured'})
        }

    } else {
        return res.json({
            message : "invalid input"
        })
    }
})

app.get('/getLectures/:id', authMiddleware , async (req , res) => {
    //@ts-ignore
    const userId = req.userId;
    const courseId = req.params['id'];

    const isUser = await purchasedCourseModel.findOne({
        userId : userId,
        courseId : courseId
    });

    if(!isUser) {
        return res.json({
            message : 'user has not purchased the course'
        });
    }

    const lectures = await lectureModel.find({
        courseId : courseId
    });

    if(lectures) {
            return res.json({
                lectures
        })
    } else {
        return res.json({
            message : 'something went wrong'
        })
    }
})

app.get('/lecture/:id' , authMiddleware , async (req , res) => {
    const lectureId = req.params['id'];

    const lecture = await lectureModel.findOne({
        _id : lectureId
    })

    if(!lecture) return res.json({message : 'invalid lecturecode'})

    return res.json({
        lecture
    });
});

app.get('/getAdminCourses' , authMiddleware , async (req , res) => {
    //@ts-ignore
    const adminId = req.userId;
    try{
        const courses = await courseModel.find({
            userId : adminId
        });
        return res.json({
            courses
        });
    } catch (error) {
        return res.json({
            message : 'some error ocurred'
        })
    }
    
});

app.post('/deleteCourse', authMiddleware , async (req , res) => {
    //@ts-ignore
    const userId = req.userId;
    const courseId = req.body.courseId;
    try {
        const response = await courseModel.deleteOne({
            _id : courseId,
            userId : userId
        });
        if(response.deletedCount) {
            return res.json({
                message : "course has been deleted"
            })
        }
    } catch(e) {
        return res.json({
            message : "some error occured",
            error : e
        })
    }
});

app.post('/deleteLecture', authMiddleware , async (req , res) => {
    //@ts-ignore
    const userId = req.userId;
    const lectureId = req.body.lectureId;
    try {
        const response = await lectureModel.deleteOne({
            _id : lectureId
        });
        if(response.deletedCount) {
            return res.json({
                message : "lecture has been deleted"
            })
        }
    } catch(e) {
        return res.json({
            message : "some error occured",
            error : e
        })
    }
})

app.listen(process.env.PORT , () => {
    console.log('listening on port');
});