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
const stripe = new Stripe(process.env.STRIPE_API_KEY || '' , {
    apiVersion: "2025-05-28.basil",
});
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
    success_url: `http://localhost:5173/paymentSuccessfull/{CHECKOUT_SESSION_ID}/${courseId}`,
    cancel_url: 'http://localhost:5173/',
    });

    res.json({url : session.url});
}catch (e) {
    res.status(500).json({
        message : e
    })
}
})

app.get('/verifyPayment', async (req , res) => {
    const sessionId = req.query.session_id as string

    if(!sessionId) res.json({
        message : 'no session id provided'
    });

    try {
        const session = await stripe.checkout.sessions.retrieve(sessionId);

        res.json({
            paymentStatus : session.payment_status,

        });
    } catch (e) {
        res.json({
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

        res.json({
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
    res.json({
        result
    })
} catch (error) {
	console.error({error});
    res.json({
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
                res.json({
                    message : 'user already exist'
                })
            }

            const hashedpassword = await bcrypt.hash(user.password , 5);

            const newUser = await userModel.create({
                username : user.username,
                password : hashedpassword
            });

            res.json({
                message : 'new user created'
            })

        } catch(e) {
            res.json({
                message : 'some error',
                error : e
            })
        }
    } else {
        res.json({
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
                res.json({  
                    token : token
                })
            } else {
                res.json({
                    message : 'incorrect creds'
                })
            }
        } else {
            res.json({
                message : "no user found"
            })
        }
    } catch (e) {
        res.json({
            error : e
        })
    }
    } else {
        res.json({
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
                res.json({
                    message : 'admin already exist'
                })
            }

            const hashedpassword = await bcrypt.hash(user.password , 5);

            const newUser = await adminModel.create({
                username : user.username,
                password : hashedpassword
            });

            res.json({
                message : 'new admin created'
            })

        } catch(e) {
            res.json({
                message : 'some error',
                error : e
            })
        }
    } else {
        res.json({
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
                res.json({  
                    token : token
                })
            } else {
                res.json({
                    message : 'incorrect creds'
                })
            }
        } else {
            res.json({
                message : "no user found"
            })
        }
    } else {
        res.json({
            message : "some error"
        })
    }
})


app.get('/me' , authMiddleware , async (req , res ) => {
    //@ts-ignore
    const userId = req.userId;

    const user = await userModel.findOne({
        _id : userId
    })

    res.json({user})
})

app.get('/adminMe' , authMiddleware , async (req , res ) => {
    //@ts-ignore
    // const userId = req.userId;

    try{
        const user = await adminModel.findOne({
            username : 'Mohammed'
        })
        res.json({user})
    } catch (e) {
        res.json({
            message : 'some error'
        })
    }

})

app.post('/createCourse' , authMiddleware  , async (req , res) => {
    //@ts-ignore
    const userId = req.userId;
    if(!userId) {
        res.json({
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
            res.json({
                message : "course already exist"
            })
        }
        const newCourse = await courseModel.create({
            title : data.title,
            description : data.description,
            price : data.price,
            imageUrl : data.imageUrl,
            userId : userId
        });

        
        if(newCourse) {
            await axios.post('http://localhost:3000/buy',{
                courseId : newCourse._id
            });
            res.json({
                message : 'course created'
            })
        }
        res.json({
            message : 'something went wrong'
        })
    } else {
        res.json({
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
        res.json({
            message : 'no course purchased'
        })
    }

    res.json({
        message : response
    })
})

app.post('/buy' , authMiddleware , async (req , res ) => {
   //@ts-ignore
    const userId = req.userId;
    const courseId = req.body.courseId;

    if(userId == null) {
        res.json({
            message : 'user is not logged in'
        })
    }

    const response = await purchasedCourseModel.findOne({
        userId : userId,
        courseId : courseId
    })
    
    if(response) {
        res.json({
            message : 'already purchased'
        });
        return;
    }

    const purchase = await purchasedCourseModel.create({
        userId : userId,
        courseId : courseId
    })

    if(purchase) {
        res.json({
            message : "purchased"
        })
    }
})

app.get('/courses' , async (req , res) => {
    const courses = await courseModel.find({}).populate('userId');

    res.json({
        courses : courses
    })
})

app.get('/course/:id', async (req , res) => {
    const courseId = req.params['id'];

    const response = await courseModel.findOne({
        _id : courseId
    })
    
    res.json({
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
                res.json({
                    message : 'lecture has been created'
                })
            } else {
                res.json({
                    message : "lecture not created"
                });
            }
        } catch(e) {
            res.json({message : 'some error ocured'})
        }

    } else {
        res.json({
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
        res.json({
            message : 'user has not purchased the course'
        });
    }

    const lectures = await lectureModel.find({
        courseId : courseId
    });

    if(lectures) {
            res.json({
                lectures
        })
    } else {
        res.json({
            message : 'something went wrong'
        })
    }
})

app.get('/lecture/:id' , authMiddleware , async (req , res) => {
    const lectureId = req.params['id'];

    const lecture = await lectureModel.findOne({
        _id : lectureId
    })

    if(!lecture) res.json({message : 'invalid lecturecode'})

    res.json({
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
        res.json({
            courses
        });
    } catch (error) {
        res.json({
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
            res.json({
                message : "course has been deleted"
            })
        }
    } catch(e) {
        res.json({
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
            res.json({
                message : "course has been deleted"
            })
        }
    } catch(e) {
        res.json({
            message : "some error occured",
            error : e
        })
    }
})

app.listen(process.env.PORT , () => {
    console.log('listening on port');
});