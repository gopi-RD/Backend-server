const express = require('express')
const app = express()
const path = require('path')
app.use(express.json())
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const bcrypt=require("bcrypt")
const jwt=require("jsonwebtoken")


const dbpath = path.join(__dirname, 'team')

let db = null

const initalizeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbpath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('Server is running at http://localhost:3000/')
    })
  } catch (e) {
    console.log(`DB Error ${e.message}`)
    process.exit(1)
  }
}

initalizeDBAndServer()

const authenticateAPI=async (request,response,next)=>{
  const authHeaders=request.headers["authorization"]
  let jwtToken; 
  if (authHeaders!==undefined){
    jwtToken=authHeaders.split(" ")[1]
  }
  if (jwtToken!==undefined){
    response.status(401)
    response.end("Invalid jwt token")
  }else{
    await jwt.verify(jwtToken,"Gopi",async (error,payload)=>{
      if (error){
        response.status(401)
        response.end("Invalid jwt token")
      }else{
        request.username=payload.username
        next();
      }
    })
  }

}

app.get("/profile",authenticateAPI,async (request,response)=>{
  const {username}=request
  try{
    const user=` SELECT * FROM userDetails WHERE username="${username}" ;`;
    const dbResp=await db.get(user);
   response.send(dbResp);
  }catch(e){
    console.log(`DB Error is ${e.message}`)

  }
  
})

app.post("/register",async (request,response)=>{
  try{
    const {userName,password,gender}=request.body;
    const hashedPassword = await bcrypt.hash(password,10)

    const selectUser=`SELECT * FROM userDetails WHERE username="${userName}" ;`
    const dbUser=await db.get(selectUser)
   if (dbUser===undefined){

    const query=`INSERT INTO userDetails(username,password,gender)VALUES(
      "${userName}","${hashedPassword}","${gender}"
    );`;
   await db.run(query)
    response.send("successfully Registered");
    
   }else{
    response.status(400)
    response.send("User Already Exists")
   }
  
  }
  catch(e){
    console.log(`DB Error is ${e.message}`)
  }
})

app.post("/login",async (request,response)=>{
  const {userName,password}=request.body 
  const selectUser=`SELECT * FROM userDetails WHERE username="${userName}" ;`
  const dbUser=await db.get(selectUser)
  if (dbUser===undefined){
    response.status(400)
    response.send("Invalid User")
  }else{
    isPasswordMatch= await bcrypt.compare(password,dbUser.password); 
    if (isPasswordMatch===true){
      const payload={username:userName}

      const jwtToken= await jwt.sign(payload,"Gopi")
      response.send({jwtToken})
      
    }else{
      response.status(400)
      response.send("Invalid Password")
    }
  }

})

