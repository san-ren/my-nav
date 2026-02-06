const fs = require('fs');
const path = require('path');

// ⚠️ 配置：你的 JSON 数据所在的文件夹路径
// 根据你之前的截图，路径应该是 'src/content/nav-groups'
const TARGET_DIR = path.join(__dirname, 'src', 'content', 'nav-groups');

/**
 * 递归删除对象中的 badge_list 字段
 */
function removeBadgeList(obj) {
  // 如果不是对象或数组，直接返回
  if (!obj || typeof obj !== 'object') {
    return;
  }

  // 如果是数组，遍历每个元素
  if (Array.isArray(obj)) {
    obj.forEach(item => removeBadgeList(item));
    return;
  }

  // --- 核心逻辑 ---
  // 如果当前对象包含 badge_list，直接删除
  if (Object.prototype.hasOwnProperty.call(obj, 'badge_list')) {
    delete obj.badge_list;
    // 如果你希望同时添加默认的 hide_badges，可以取消下面这行的注释：
    // obj.hide_badges = []; 
  }
  
  // 继续递归遍历该对象的所有属性值（防止漏掉深层嵌套）
  Object.keys(obj).forEach(key => {
    removeBadgeList(obj[key]);
  });
}

/**
 * 主函数：处理文件
 */
function processFiles() {
  if (!fs.existsSync(TARGET_DIR)) {
    console.error(`❌ 错误：找不到目录 ${TARGET_DIR}`);
    return;
  }

  const files = fs.readdirSync(TARGET_DIR);
  let count = 0;

  files.forEach(file => {
    // 只处理 .json 文件
    if (path.extname(file) === '.json') {
      const filePath = path.join(TARGET_DIR, file);
      
      try {
        // 1. 读取文件
        const rawData = fs.readFileSync(filePath, 'utf-8');
        const jsonData = JSON.parse(rawData);

        // 2. 执行清理
        removeBadgeList(jsonData);

        // 3. 写回文件 (保持 2 空格缩进)
        fs.writeFileSync(filePath, JSON.stringify(jsonData, null, 2), 'utf-8');
        
        console.log(`✅ 已清理: ${file}`);
        count++;
      } catch (err) {
        console.error(`❌ 处理文件 ${file} 时出错:`, err);
      }
    }
  });

  console.log(`\n🎉 全部完成！共处理了 ${count} 个文件。`);
  console.log(`请重新启动 npm run dev 查看效果。`);
}

// 运行脚本
processFiles();