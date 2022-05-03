import { get_home_dir, usleep, utf8_strdown, USEC_PER_SEC } from "./out.ts";

usleep(USEC_PER_SEC * 1);
console.log(get_home_dir());
console.log(utf8_strdown("Deno + GObject Introspection = <3", -1));
