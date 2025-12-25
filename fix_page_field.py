import json
import os

# 配置数据目录
BASE_DIR = os.path.join("src", "data", "nav")

def fix_json_files():
    count = 0
    # 遍历 src/data/nav 下的所有文件夹
    for page_id in os.listdir(BASE_DIR):
        page_path = os.path.join(BASE_DIR, page_id)
        
        # 确保是文件夹且包含 groups 子文件夹
        groups_path = os.path.join(page_path, "groups")
        if os.path.isdir(page_path) and os.path.exists(groups_path):
            
            print(f"📂 正在处理页面: {page_id}")
            
            # 遍历 groups 下的 json 文件
            for filename in os.listdir(groups_path):
                if filename.endswith(".json"):
                    file_path = os.path.join(groups_path, filename)
                    
                    try:
                        # 读取
                        with open(file_path, 'r', encoding='utf-8') as f:
                            data = json.load(f)
                        
                        # 检查并修复
                        if data.get("page") != page_id:
                            data["page"] = page_id # 核心：补全 page 字段
                            
                            # 写入
                            with open(file_path, 'w', encoding='utf-8') as f:
                                json.dump(data, f, ensure_ascii=False, indent=2)
                            
                            print(f"  ✅ 已修复: {filename}")
                            count += 1
                        else:
                            print(f"  👌 跳过: {filename} (无需修复)")
                            
                    except Exception as e:
                        print(f"  ❌ 错误 {filename}: {e}")

    print("\n" + "="*30)
    print(f"🎉 处理完成！共修复了 {count} 个文件。")
    print("现在刷新 CMS 后台，列表应该会自动按页面归类显示了。")

if __name__ == "__main__":
    if os.path.exists(BASE_DIR):
        fix_json_files()
    else:
        print(f"错误: 找不到目录 {BASE_DIR}")