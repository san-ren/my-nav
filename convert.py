import json
import os
import re
import shutil

# 配置源文件和目标目录
SOURCE_DIR = os.path.join("src", "data", "nav")
TARGET_DIR = os.path.join("src", "data", "nav_new") # 先生成到临时目录，确认无误后再替换

# 允许的文件列表
FILES_TO_PROCESS = ["home.json", "sub1.json"]

def sanitize_filename(name):
    # 替换文件名中的非法字符，如 / \ : * ? " < > |
    name = re.sub(r'[\\/*?:"<>|]', "", name)
    # 将空格替换为下划线
    name = name.replace(" ", "_")
    return name.strip()

def process_file(filename):
    file_path = os.path.join(SOURCE_DIR, filename)
    if not os.path.exists(file_path):
        print(f"跳过: {filename} 不存在")
        return

    print(f"正在处理: {filename} ...")
    
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # 1. 获取页面ID (用文件名去掉.json作为ID，或者读取内部id字段)
    page_id = data.get("id", os.path.splitext(filename)[0])
    
    # 创建页面目录: nav_new/home/
    page_dir = os.path.join(TARGET_DIR, page_id)
    # 创建分组目录: nav_new/home/groups/
    groups_dir = os.path.join(page_dir, "groups")
    
    if os.path.exists(page_dir):
        shutil.rmtree(page_dir)
    os.makedirs(groups_dir)

    # 2. 提取并保存 meta.json (页面元数据)
    meta_data = {
        "id": page_id,
        "name": data.get("name", ""),
        "icon": data.get("icon", ""),
        "sortOrder": data.get("sortOrder", 99)
    }
    
    meta_path = os.path.join(page_dir, "meta.json")
    with open(meta_path, 'w', encoding='utf-8') as f:
        json.dump(meta_data, f, ensure_ascii=False, indent=2)
    print(f"  -> 生成元数据: {meta_path}")

    # 3. 提取并分割 groups
    groups = data.get("groups", [])
    for index, group in enumerate(groups):
        group_name = group.get("name", f"group_{index}")
        # 为了保证顺序，文件名前加序号：01_名称.json
        # 同时解决你的问题2：用文件名作为稳定性较高的标识
        safe_name = sanitize_filename(group_name)
        file_name = f"{index+1:02d}_{safe_name}.json"
        
        group_file_path = os.path.join(groups_dir, file_name)
        
        with open(group_file_path, 'w', encoding='utf-8') as f:
            json.dump(group, f, ensure_ascii=False, indent=2)
        print(f"  -> 生成分组: {file_name}")

if __name__ == "__main__":
    if not os.path.exists(SOURCE_DIR):
        print(f"错误: 找不到源目录 {SOURCE_DIR}")
    else:
        for f in FILES_TO_PROCESS:
            process_file(f)
        
        print("\n" + "="*30)
        print("✅ 转换完成！")
        print(f"新文件在 '{TARGET_DIR}' 目录下。")
        print("请检查无误后，删除 'src/data/nav' 下的旧 json，将新文件夹复制进去。")