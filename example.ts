import { TimeZone, filename_display_basename } from "./out.ts";

const zone = TimeZone.new_local();
console.log(zone.get_identifier());

console.log(filename_display_basename("nyaaa/example.ts"));
