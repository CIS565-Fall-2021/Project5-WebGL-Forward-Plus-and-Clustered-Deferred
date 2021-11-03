export function glsl(template, ...args) {
  let str = '';
  for (let i = 0; i < args.length; i += 1) {
      str += template[i] + args[i];
  }
  return str + template[template.length - 1];
}