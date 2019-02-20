import { drone } from "../../app";
import { getSurveyById } from "./getSurveyById";

export const surveyModule = drone.module(getSurveyById);
