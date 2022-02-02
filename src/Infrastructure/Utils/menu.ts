interface MenuItem {
    title: string
    items: string[]
}
export const createMenuNumber = (
    items: MenuItem[],
    sortable: boolean = false
) => {
    let resultMenu: string[] = []
    items.forEach((item) => {
        if (sortable) item.items.sort()
        resultMenu.push(`*${item.title}*`)
        item.items.forEach((command, i) => {
            resultMenu.push(i + 1 + '. ' + command)
        })
        resultMenu.push('\n\n')
    })
    return resultMenu.join('\n').trim()
}
export const createMenu = (
    items: MenuItem[],
    sortable: boolean = true
): string => {
    let resultMenu: string[] = []
    items.forEach((item) => {
        if (sortable) item.items.sort()
        resultMenu.push(`╭─❒ ⌜*${item.title}*⌟ ❒`)
        item.items.forEach((command) => {
            resultMenu.push('┃⬡ ' + command)
        })
        resultMenu.push('└──────────────', '\n\n')
    })
    return resultMenu.join('\n').trim()
}
export const createMenuV2 = (
    items: MenuItem[],
    sortable: boolean = true
): string => {
    let resultMenu: string[] = []
    items.forEach((item) => {
        if (sortable) item.items.sort()
        resultMenu.push(`╭─❒ ⌜*${item.title}*⌟ ❒`)
        item.items.forEach((command) => {
            resultMenu.push('├ ツ ' + command)
        })
        resultMenu.push('└❏', '\n\n')
    })
    return resultMenu.join('\n').trim()
}
export const createMenuV3 = (
    items: MenuItem[],
    sortable: boolean = true
): string => {
    let resultMenu: string[] = []
    items.forEach((item) => {
        if (sortable) item.items.sort()
        resultMenu.push(`┌────“*${item.title}*„────`)
        item.items.forEach((command) => {
            resultMenu.push('│‣ ' + command)
        })

        resultMenu.push('└➤ ', '\n\n')
    })
    return resultMenu.join('\n').trim()
}
