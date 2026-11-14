// Loads the answer under test. The scorer sets ANSWER to the file a model produced.
import { pathToFileURL } from "node:url";
export const answer = () => import(pathToFileURL(process.env.ANSWER).href);
