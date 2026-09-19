import express from "express";
import cors from "cors";
import yaml from "js-yaml";
import fs from "node:fs/promises";
import path from "node:path";

const app=express();
const port=process.env.PORT||8080;
app.use(cors());
app.use(express.json({limit:"1mb"}));

const bank=JSON.parse(await fs.readFile(path.join(process.cwd(),"data/exams.json"),"utf8"));
app.get("/health",(_,res)=>res.json({status:"ok",service:"certpulse-api",version:"0.1.0"}));
app.get("/api/certifications",(_,res)=>res.json(Object.entries(bank).map(([id,x])=>({id,name:x.name,questions:x.questions.length}))));
app.get("/api/questions/:cert",(req,res)=>{const x=bank[req.params.cert];if(!x)return res.status(404).json({error:"Unknown certification"});res.json(x.questions)});
app.post("/api/validate/yaml",(req,res)=>{
  try{
    const doc=yaml.load(String(req.body?.yaml||""));
    if(!doc||typeof doc!=="object")return res.status(400).json({valid:false,errors:["YAML must contain an object"]});
    const spec=req.body?.spec||{};const errors=[];
    if(spec.apiVersion&&doc.apiVersion!==spec.apiVersion)errors.push("apiVersion does not match the task");
    if(spec.kind&&doc.kind!==spec.kind)errors.push("kind does not match the task");
    if(spec.name&&doc.metadata?.name!==spec.name)errors.push("metadata.name does not match the task");
    if(spec.containerName){const containers=doc.spec?.containers||doc.spec?.template?.spec?.containers||[];if(!containers.some(c=>c.name===spec.containerName))errors.push("required container name is missing")}
    res.json({valid:errors.length===0,errors,resource:{apiVersion:doc.apiVersion,kind:doc.kind,name:doc.metadata?.name}});
  }catch(e){res.status(400).json({valid:false,errors:[e.message]})}
});
app.listen(port,()=>console.log("CertPulse API listening on "+port));
