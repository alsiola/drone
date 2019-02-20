import { drone } from "./app";
import { surveyModule } from "./modules";

drone.use(surveyModule);

drone.listen(3000).then(() => {
    console.log("Listening on port 3000");
});
