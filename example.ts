import {
  base64_encode,
  build_filenamev,
  get_home_dir,
  USEC_PER_SEC,
  usleep,
  utf8_strdown,
} from "./out.ts";

usleep(USEC_PER_SEC * 1);
console.log(get_home_dir());
console.log(utf8_strdown("Deno + GObject Introspection = <3", -1));

console.log(base64_encode([1, 2, 3], 3));
console.log(build_filenamev(["/", "home", "user", "file.txt"]));
