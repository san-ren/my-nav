import json
import os
import requests
import re
from urllib.parse import urlparse--- 模拟从 smart-parse 导出的逻辑 ---CONFIG = {
'localIconPath': 'public/images/logos',
'publicIconPrefix': '/images/logos',
'timeout': 8000,
}USER_AGENTS = [
'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
]def process_file(file_path):
print(f"处理文件: {file_path}")
with open(file_path, 'r', encoding='utf-8') as f:
data = json.load(f)modified = False

# 遍历直属资源
if 'resources' in data:
    for resource in data['resources']:
        if not resource.get('icon') or not resource['icon'].startswith('/images/logos/'):
            print(f"发现缺失本地图标的资源: {resource.get('name')}")
            new_icon = fetch_icon_from_api(resource.get('url'))
            if new_icon:
                resource['icon'] = new_icon
                modified = True
                
# 遍历分类中的资源
if 'categories' in data:
    for category in data['categories']:
        if 'resources' in category:
            for resource in category['resources']:
                if not resource.get('icon') or not resource['icon'].startswith('/images/logos/'):
                    print(f"发现缺失本地图标的资源: {resource.get('name')}")
                    new_icon = fetch_icon_from_api(resource.get('url'))
                    if new_icon:
                        resource['icon'] = new_icon
                        modified = True
        
        # 遍历分类标签页中的资源
        if 'tabs' in category:
            for tab in category['tabs']:
                if 'list' in tab:
                    for resource in tab['list']:
                        if not resource.get('icon') or not resource['icon'].startswith('/images/logos/'):
                            print(f"发现缺失本地图标的资源: {resource.get('name')}")
                            new_icon = fetch_icon_from_api(resource.get('url'))
                            if new_icon:
                                resource['icon'] = new_icon
                                modified = True

if modified:
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"已保存更改: {file_path}")
def fetch_icon_from_api(url):
if not url: return None# 调用 Astro 运行的 API 端点
api_endpoint = f"http://localhost:4321/api/smart-parse?url={requests.utils.quote(url)}"
try:
    response = requests.get(api_endpoint, timeout=10)
    if response.status_code == 200:
        result = response.json()
        if result.get('icon') and result['icon'].startswith('/images/logos/'):
            print(f"  成功获取图标: {result['icon']}")
            return result['icon'].split('?')[0] # 移除时间戳
except Exception as e:
    print(f"  API调用失败或处理异常: {str(e)}")

return None
if name == "main":
groups_dir = 'src/content/nav-groups'
if not os.path.exists(groups_dir):
print("未找到 nav-groups 目录")
exit(1)for filename in os.listdir(groups_dir):
    if filename.endswith('.json'):
        process_file(os.path.join(groups_dir, filename))
