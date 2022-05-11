import { Regex } from "./out.ts";

const regex = new Regex("Good kitties like to OwO!", 0, 0);
const replaced = regex.replace(["OwO"], -1, 0, "UwU", 0);
console.log("www");

console.log(replaced);
