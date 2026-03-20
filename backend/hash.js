import bcrypt from "bcrypt";
bcrypt.hash("admin@123", 10).then(console.log);
