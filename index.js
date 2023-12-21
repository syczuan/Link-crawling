const fs = require("fs");
const path = require("path");
const resolve = (dir) => {
  return path.join(__dirname, dir);
};
const axios = require("axios");
const cheerio = require("cheerio");

const originUrl = process.argv[2];
if (!originUrl) {
  return;
}
const filename = `${originUrl.split("//")[1].split(":")[0]}`;
const fileDir = resolve(`./output/${filename}.json`);
const errFileDir = resolve(`./output/${filename}-error.json`);
let errorLink = [];

if (!fs.existsSync(resolve("./output"))) {
  try {
    fs.mkdirSync(resolve("./output"), { recursive: true });
  } catch (err) {
    return;
  }
}

const getLinks = async (url, origin, visited = new Set(), result = []) => {
  if (visited.has(url)) {
    return result;
  }

  visited.add(url);

  const { data } = await axios.get(url);
  const $ = cheerio.load(data);
  const list = $("a");

  for (let i = 0; i < list.length; i++) {
    const link = $(list[i]).attr("href");
    try {
      if (link) {
        if (link.startsWith("http")) {
          if (link.includes(origin) && !visited.has(link)) {
            result.push(link);
            const children = await getLinks(link, origin, visited, result);
            result = [...new Set(result.concat(children))];
          }
        } else {
          if (link[0] === "/" && !visited.has(origin + link)) {
            const completeLink = origin + link;
            result.push(completeLink);
            const children = await getLinks(
              completeLink,
              origin,
              visited,
              result
            );
            result = [...new Set(result.concat(children))];
          }
        }
      }
      console.log(
        `${result.length} ${i + 1}/${list.length} ${(
          ((i + 1) / list.length) *
          100
        ).toFixed(2)}%`
      );
    } catch (error) {
      // 记录错误链接
      if (!errorLink.find((e) => e.link === link)) {
        errorLink.push({
          link: link,
          error: error,
        });
        const errorData = JSON.stringify(errorLink, null, 2);
        try {
          fs.writeFileSync(errFileDir, errorData);
        } catch (err) {
          console.log(err);
        }
      }
    }
  }
  const jsonData = JSON.stringify(result, null, 2);
  try {
    fs.writeFileSync(fileDir, jsonData);
  } catch (error) {
    console.log(error);
  }
  return result;
};

const start = async () => {
  const links = await getLinks(originUrl, originUrl);
  const uniqueLinks = [...new Set(links)];

  console.log(`Total: ${uniqueLinks.length}`);
  const jsonData = JSON.stringify(uniqueLinks, null, 2);
  try {
    fs.writeFileSync(fileDir, jsonData);
  } catch (error) {
    console.log(error);
  }
};

start();
