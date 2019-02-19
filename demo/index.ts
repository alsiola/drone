import { drone } from "./app";
import { getSurveyById } from "./modules/survey/controller";

drone.use(getSurveyById);

drone.listen(3000).then(() => {
    console.log("Listening on port 3000");
});
