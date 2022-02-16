import v1, { v1Prefix } from "..";
import { glob2regex } from "../../../Infrastructure/Utils/regex";

v1().command.register({
    // type `.hai`
    pattern:glob2regex(v1Prefix+'hai'),
    handler: async (context) => {
        await context.reply({
            text: "hello world"
        })
    }
})

v1().command.register({
    // type `hello`, `helo`
    pattern:glob2regex('he(l,)lo'),
    handler: async (context) => {
        await context.reply({
            text: "hello world"
        })
    }
})