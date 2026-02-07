/**
 * Forward Widget Module: 91Porn (Fixed Version)
 * 适配自作者原始 TypeScript 逻辑，修复了数据缺失与功能对齐问题
 */

const DEFAULT_BASE_URL = "https://91porn.com";

// 版本号生成逻辑
const widgetVersion = (() => {
  const date = new Date();
  return `0.0.1-${
   .map((item) => item.toString().padStart(2, "0"))
   .join("")}`;
})();

/**
 * 助手函数：处理相对路径补全
 */
const fixUrl = (url, baseUrl) => {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  const base = baseUrl.endsWith("/")? baseUrl.slice(0, -1) : baseUrl;
  return url.startsWith("/")? `${base}${url}` : `${base}/${url}`;
};

WidgetMetadata = {
  id: "nsfw.91porn",
  title: "91Porn",
  description: "🔞 91Porn 视频搜索",
  author: "匿名",
  version: widgetVersion,
  requiredVersion: "0.0.1",
  site: "https://github.com/baranwang/forward-widgets",
  detailCacheDuration: 1,
  globalParams:,
  modules:,
        },
        {
          name: "page",
          title: "页码",
          type: "page",
          value: "1",
        },
      ],
    },
    {
      type: "stream",
      id: "loadResource",
      title: "加载资源",
      functionName: "loadResource",
    },
  ],
};

/**
 * 获取视频列表
 */
get91pornList = async (params) => {
  const baseUrl = params.base_url |

| DEFAULT_BASE_URL;
  const sortBy = params.sort_by |

| "rf";
  const page = params.page |

| "1";

  try {
    const targetUrl = `${baseUrl}/v.php?category=${sortBy}&viewtype=basic&page=${page}`;
    const response = await Widget.http.get(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": baseUrl
      }
    });

    if (!response ||!response.data) return;

    const $ = Widget.html.load(response.data);
    const results =;

    $(".videos-text-align").each((_, el) => {
      const $el = $(el);
      
      // 1. 蜜罐检测
      if ($el.closest(".col-lg-8").length > 0) return;

      const linkAttr = $el.find("a").attr("href");
      if (!linkAttr) return;

      const fullLink = fixUrl(linkAttr, baseUrl);
      const backdropPath = $el.find(".img-responsive").attr("src");

      const item = {
        id: fullLink,
        type: "url",
        mediaType: "movie",
        link: fullLink,
        title: $el.find(".video-title").text().trim(),
        coverUrl: fixUrl(backdropPath, baseUrl), // 映射为 Forward 标准字段
      };

      // 提取时长
      try {
        item.durationText = $el.find(".duration").text().trim();
      } catch (e) {}

      // 2. 生成预览预览地址
      try {
        const videoID = backdropPath && backdropPath.split("/").pop().split(".").shift();
        if (videoID) {
          item.previewUrl = `https://vthumb.killcovid2021.com/thumb/${videoID}.mp4`;
        }
      } catch (e) {}

      // 3. 提取发布日期（处理 textContent）
      try {
        const addTimeEl = $el.find(".info").filter((_, e) => $(e).text().includes("添加时间"));
        const nextNode = addTimeEl && addTimeEl.nextSibling;
        if (nextNode && nextNode.nodeType === 3) { // 文本节点
          item.releaseDate = nextNode.nodeValue.trim();
        }
      } catch (e) {}

      results.push(item);
    });

    return results;
  } catch (error) {
    console.error("List Load Failed:", error);
    return;
  }
};

/**
 * 加载视频详情与解密
 */
loadDetail = async (url) => {
  try {
    const response = await Widget.http.get(url, {
      headers: { "Referer": DEFAULT_BASE_URL }
    });
    if (!response ||!response.data) throw new Error("Detail empty");

    const $ = Widget.html.load(response.data);
    const player = $("#player_one");
    const script = player.find("script").text();
    
    // 4. strencode2 解码
    const match = script.match(/strencode2\("(.*?)"\)/);
    if (!match) throw new Error("strencode2 not found");
    
    const sourceHtml = decodeURIComponent(match[1]);
    const $source = Widget.html.load(sourceHtml);
    const videoUrl = $source("source").attr("src");

    if (!videoUrl) throw new Error("Video URL not found");

    const result = {
      id: url,
      type: "detail",
      mediaType: "movie",
      link: url,
      title: $("#videodetails h4").first().text().trim(),
      coverUrl: player.attr("poster"),
      videoUrl: videoUrl,
    };

    // 提取描述并处理换行
    try {
      const descHtml = $("#v_desc").html();
      if (descHtml) {
        result.description = Widget.html.load(descHtml.replace(/<br\s*\/?>/g, "\n")).text().trim();
      }
    } catch (e) {}

    // 提取相关视频 (ChildItems)
    try {
      const children =;
      $(".well").each((_, el) => {
        const $el = $(el);
        const childLink = $el.find("a").attr("href");
        if (!childLink) return;
        
        children.push({
          id: fixUrl(childLink, DEFAULT_BASE_URL),
          type: "url",
          mediaType: "movie",
          link: fixUrl(childLink, DEFAULT_BASE_URL),
          title: $el.find(".video-title").text().trim(),
          durationText: $el.find(".duration").text().trim(),
          coverUrl: fixUrl($el.find(".img-responsive").attr("src"), DEFAULT_BASE_URL),
        });
      });
      result.childItems = children;
    } catch (e) {}

    return result;
  } catch (error) {
    console.error("Load Detail Error:", error);
    return null;
  }
};

/**
 * 资源加载入口
 */
loadResource = async (params) => {
  const baseUrl = params.base_url |

| DEFAULT_BASE_URL;
  const { id, link, videoUrl } = params;
  const url = [id, link, videoUrl].find((item) => item && item.startsWith(baseUrl));

  if (!url) return;

  const detail = await loadDetail(url);
  if (!detail) return;

  return [{
    name: detail.title,
    description: detail.description |

| "",
    url: detail.videoUrl,
  }];
};
