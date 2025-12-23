import { NextFunction, Request, Response } from "express";
const jwt = require("jsonwebtoken")
import { secret } from "./config";

export async function authMiddleware(req : Request , res : Response , next : NextFunction) {
    const token = req.headers['authorization']
    if(token != null) {
        try{
        const decoded = jwt.verify(token , secret)
        if(decoded) {
            if(typeof decoded == "string") {
                return res.json({
                  message : "incorrect token"
                });
            }
            req.userId = decoded._id;
            next();
        } else {
            res.json({
                message : "something went wrong"
            })
        }
    } catch (e) {
        res.json({
            error : e
        })
    }
    } else {
        res.json({
            message : 'no token provided'
        })
    }
}
