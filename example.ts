import { MatchInfo, Regex, RegexMatchFlags } from "./out.ts";

const regex = new Regex("owo", 0, 0);

const info = new MatchInfo();
// @ts-ignore
info.internalPointer = null;

console.log(regex.match("owo", 0, info));
