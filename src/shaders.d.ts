/**
 * Declare that the imported value of any shader program file is simply a string (the file contents).
 */
declare module "*.glsl" {
  const content: string;
  export default content;
}