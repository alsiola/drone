import { drone } from "./app";

drone.listen(3000).then(() => {
    console.log("Listening on port 3000");
});
