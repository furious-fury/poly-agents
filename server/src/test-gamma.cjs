
async function main() {
    const url = "https://gamma-api.polymarket.com/events?active=true&closed=false&limit=5&order=volume24hr&ascending=false";
    console.log("Fetching:", url);
    try {
        const res = await fetch(url);
        const data = await res.json();
        console.log("Response Type:", Array.isArray(data) ? "Array" : typeof data);
        if (Array.isArray(data) && data.length > 0) {
            console.log("First Item Keys:", Object.keys(data[0]));
            if (data[0].markets) {
                console.log("First Item 'markets' type:", Array.isArray(data[0].markets) ? "Array" : typeof data[0].markets);
            }
            if (data[0].tags) {
                console.log("First Item 'tags' type:", Array.isArray(data[0].tags) ? "Array" : typeof data[0].tags);
            }
        }
    } catch (e) {
        console.error(e);
    }
}

main();
