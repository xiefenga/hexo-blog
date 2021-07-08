const { homedir } = require("os");
const { resolve, join } = require("path");
const { link, readdir, rmdir, mkdir } = require("fs/promises");

async function createBlogLinks() {
  const dir = resolve(homedir(), 'Desktop', 'blogs');
  const post = resolve(__dirname, './source/_posts');
  try {
    await rmdir(dir, { recursive: true });
    console.log('blogs目录删除成功');
    await mkdir(dir);
    console.log('blogs目录创建成功');
  } catch (error) {
    console.log(error);
  }

  const filenames = await readdir(post);

  filenames.forEach(async f => {
    await link(join(post, f), join(dir, f));
    console.log(f, '=> 创建完毕');
  });
}

createBlogLinks();
