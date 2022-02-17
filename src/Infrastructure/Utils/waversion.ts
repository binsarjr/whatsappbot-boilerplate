import cheerio from 'cheerio'
import got from 'got/dist/source'

const waweb = 'https://web.whatsapp.com'
const wawebGot = got.extend({
    headers: {
        'User-Agent':
            'Mozilla/5.0 (X11; Linux x86_64; rv:97.0) Gecko/20100101 Firefox/97.0',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        DNT: '1',
        Connection: 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'cross-site',
        Pragma: 'no-cache',
        'Cache-Control': 'no-cache'
    }
})

export const getCurrentWaWebVersion = async (): Promise<
    [number, number, number] | null
> => {
    const body = await wawebGot(waweb).text()
    const $ = cheerio.load(body)

    let scriptUrl: string = ''
    $('script').each((i, el) => {
        let src = $(el).attr('src')
        if (src?.includes('/bootstrap_qr.')) {
            scriptUrl = `${waweb}${src}`
        }
    })

    const scriptBody = await wawebGot(scriptUrl).text()

    const version = scriptBody.match(/VERSION_BASE:"([0-9.]+)"/is)
    return (
        (version?.[1].split('.', 3).map(parseFloat) as [
            number,
            number,
            number
        ]) || null
    )
}
