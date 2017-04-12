const md5 = require('md5')
const redis = require('redis').createClient(process.env.REDIS_URL)

// Cookie id for authentication.
const cooKey = 'sid'

// Array of users. Holds username, salt, and hash data for users.
const users = []

// Map of session IDs to usernames.
var sessions = 0
const sessionUser = {}

const debug = (req, res) => {
    // res.send(users)
}

const loginUser = (req, res) => {   
    console.log('Payload received:', req.body)
    if(!req.body.username || !req.body.password){
        res.sendStatus(400)
        return
    }

    const requestedUser = users.find(({username}) => {
        return username === req.body.username
    })
  
    if (requestedUser && requestedUser.salt && requestedUser.hash){
        const hashedPassword = md5(`lol${req.body.password}${requestedUser.salt}`)
        if (hashedPassword !== requestedUser.hash){
            res.sendStatus(401)
            return
        }
    } else{
        res.sendStatus(401)
        return
    }
    sessionUser[sessions] = requestedUser.username
    redis.hmset(sessions, requestedUser.username)
    res.cookie(cooKey, `${sessions++}`, { maxAge: 3600*1000, httpOnly: true })
    res.send({result: "success", username: req.body.username})
}

const isLoggedIn = (req, res, next) => {
    console.log('Payload received:', req.body)
    const sid = req.cookies[cooKey]
    if(!sid){
         return res.sendStatus(401)
    }
    redis.hgetall(sid, (err, username) => { 
        console.log(sid + ' mapped to ' + username)
        if (username){
            req.body.username = username
            next()
        } else{
            return res.sendStatus(400)
        }
    })
}

const logoutUser = (req, res) => {
    console.log('Payload received:', req.body)
    delete sessionUser[req.cookies[cooKey]]
    redis.del(req.cookies[cooKey])
    res.cookie(cooKey, "", { httpOnly: true })
    res.send("OK")
}

const registerUser = (req, res) => {
    console.log('Payload received:', req.body)
    const salt = Math.random() * 1000
    const hash = md5(`lol${req.body.password}${salt}`)
    users.push({ 
        username: req.body.username,
        email: req.body.email,
        dob: req.body.dob,
        zipcode: req.body.zipcode,
        salt: salt,
        hash: hash
    })
    res.send({result: "success", username: req.body.username})
}

const updatePassword = (req, res) => {
    // Password changing is not supported. Return with denial message.
    res.send({username: sessionUser[req.cookies[cooKey]], status: 'cannot change password'})
}

module.exports = (app) => {
    app.get('/', debug)
    app.post('/login', loginUser)
    app.put('/logout', isLoggedIn, logoutUser)
    app.post('/register', registerUser)
    app.put('/password', isLoggedIn, updatePassword)
}