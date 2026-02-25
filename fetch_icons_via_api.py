#!/usr/bin/env python3
"""
批量获取资源图标的 Python 脚本（调用后台API版本）

功能：
1. 遍历 nav-groups 目录下的所有 JSON 文件
2. 找出没有本地图标的资源
3. 调用网站后台的 /api/smart-parse API 获取图标
4. 更新 JSON 文件中的 icon 字段

使用方法：
    python fetch_icons_via_api.py [--workers N] [--dry-run] [--verbose] [--base-url URL]

参数：
    --workers N     并行工作线程数（默认 5，避免API过载）
    --dry-run       只检查不修改文件
    --verbose       显示详细输出
    --base-url URL  网站后台API地址（默认 http://localhost:4321）

注意：
    运行此脚本前，请确保网站服务器已启动（npm run dev 或 npm run preview）
"""

import json
import os
import re
import sys
import argparse
from urllib.parse import urlparse, quote
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
from threading import Lock
import time

try:
    import requests
except ImportError:
    print("请先安装依赖: pip install requests")
    sys.exit(1)

# ==================== 配置 ====================
CONFIG = {
    'local_icon_path': 'public/images/logos',
    'public_icon_prefix': '/images/logos',
    'timeout': 30,  # API 请求超时时间
    'retry_count': 2,  # 失败重试次数
    'retry_delay': 1,  # 重试间隔（秒）
}

# 全局锁用于线程安全的文件写入
file_lock = Lock()
print_lock = Lock()


def safe_print(*args, **kwargs):
    """线程安全的打印"""
    with print_lock:
        print(*args, **kwargs)


def has_local_icon(resource):
    """检查资源是否有本地图标"""
    icon = resource.get('icon', '')
    return icon and '/images/logos/' in icon


def call_smart_parse_api(url, base_url, verbose=False):
    """调用后台 API 获取图标"""
    api_url = f"{base_url}/api/smart-parse?url={quote(url)}"
    
    if verbose:
        safe_print(f"  调用 API: {api_url}")
    
    for attempt in range(CONFIG['retry_count']):
        try:
            response = requests.get(api_url, timeout=CONFIG['timeout'])
            
            if response.status_code == 200:
                data = response.json()
                icon = data.get('icon', '')
                
                # 检查返回的图标是否是本地图标
                if icon and '/images/logos/' in icon:
                    # 移除时间戳参数
                    clean_icon = icon.split('?')[0]
                    return clean_icon, data
                else:
                    if verbose:
                        safe_print(f"  API 返回非本地图标: {icon}")
                    return None, data
            elif response.status_code == 404:
                if verbose:
                    safe_print(f"  API 返回 404: 资源不存在")
                return None, None
            else:
                if verbose:
                    safe_print(f"  API 返回错误: HTTP {response.status_code}")
                if attempt < CONFIG['retry_count'] - 1:
                    time.sleep(CONFIG['retry_delay'])
                    continue
                return None, None
                
        except requests.exceptions.Timeout:
            if verbose:
                safe_print(f"  API 请求超时")
            if attempt < CONFIG['retry_count'] - 1:
                time.sleep(CONFIG['retry_delay'])
                continue
            return None, None
        except Exception as e:
            if verbose:
                safe_print(f"  API 请求异常: {e}")
            if attempt < CONFIG['retry_count'] - 1:
                time.sleep(CONFIG['retry_delay'])
                continue
            return None, None
    
    return None, None


def process_single_resource(resource, base_url, verbose=False):
    """处理单个资源（用于并行调用）"""
    if has_local_icon(resource):
        return None, None, 'skipped'

    name = resource.get('name', 'Unknown')
    url = resource.get('url') or resource.get('official_site')

    if not url:
        return name, None, 'no_url'

    icon, api_data = call_smart_parse_api(url, base_url, verbose)

    if icon:
        return name, icon, 'success'
    else:
        return name, None, 'failed'


def process_file(file_path, base_url, workers=5, dry_run=False, verbose=False):
    """处理单个 JSON 文件"""
    safe_print(f"\n处理文件: {file_path}")

    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # 收集所有需要处理的资源
    resources_to_process = []

    # 收集直属资源
    if 'resources' in data:
        for resource in data['resources']:
            if not has_local_icon(resource):
                resources_to_process.append(resource)

    # 收集分类中的资源
    if 'categories' in data:
        for category in data['categories']:
            if 'resources' in category:
                for resource in category['resources']:
                    if not has_local_icon(resource):
                        resources_to_process.append(resource)

            if 'tabs' in category:
                for tab in category['tabs']:
                    if 'list' in tab:
                        for resource in tab['list']:
                            if not has_local_icon(resource):
                                resources_to_process.append(resource)

    if not resources_to_process:
        safe_print(f"  没有需要处理的资源")
        return {'total': 0, 'success': 0, 'failed': 0, 'skipped': 0}

    safe_print(f"  发现 {len(resources_to_process)} 个需要处理的资源")

    if dry_run:
        for resource in resources_to_process:
            safe_print(f"  发现缺失本地图标的资源: {resource.get('name')} ({resource.get('url')})")
        return {'total': len(resources_to_process), 'success': 0, 'failed': 0, 'skipped': 0}

    # 并行处理
    stats = {'total': len(resources_to_process), 'success': 0, 'failed': 0, 'skipped': 0}
    results = {}

    with ThreadPoolExecutor(max_workers=workers) as executor:
        future_to_idx = {
            executor.submit(process_single_resource, resource, base_url, verbose): idx
            for idx, resource in enumerate(resources_to_process)
        }

        for future in as_completed(future_to_idx):
            idx = future_to_idx[future]
            try:
                name, icon, status = future.result()
                if status == 'success':
                    stats['success'] += 1
                    results[idx] = icon
                    safe_print(f"    ✓ {name}: {icon}")
                elif status == 'failed':
                    stats['failed'] += 1
                    safe_print(f"    ✗ {name}: 获取失败")
                elif status == 'no_url':
                    stats['skipped'] += 1
                    safe_print(f"    - {name}: 无URL")
            except Exception as e:
                stats['failed'] += 1
                safe_print(f"    ✗ 处理异常: {e}")

    # 更新 JSON 数据
    modified = False
    for idx, icon in results.items():
        if icon:
            resources_to_process[idx]['icon'] = icon
            modified = True

    # 保存文件
    if modified:
        with file_lock:
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
        safe_print(f"  已保存更改: {file_path}")

    return stats


def check_server_status(base_url):
    """检查服务器是否运行"""
    try:
        response = requests.get(f"{base_url}/", timeout=5)
        return response.status_code < 500
    except:
        return False


def main():
    parser = argparse.ArgumentParser(description='批量获取资源图标（调用后台API版本）')
    parser.add_argument('--workers', '-w', type=int, default=5, help='并行工作线程数（默认 5）')
    parser.add_argument('--dry-run', action='store_true', help='只检查不修改')
    parser.add_argument('--verbose', '-v', action='store_true', help='显示详细输出')
    parser.add_argument('--base-url', type=str, default='http://localhost:4321', help='网站后台API地址（默认 http://localhost:4321）')
    args = parser.parse_args()

    # 检查目录
    groups_dir = Path('src/content/nav-groups')
    if not groups_dir.exists():
        print(f"错误: 未找到目录 {groups_dir}")
        sys.exit(1)

    print("=" * 60)
    print("批量获取资源图标（调用后台API版本）")
    print("=" * 60)
    print(f"API 地址: {args.base_url}")
    print()
    
    # 检查服务器状态
    print("检查服务器状态...")
    if not check_server_status(args.base_url):
        print(f"❌ 错误: 无法连接到服务器 {args.base_url}")
        print()
        print("请确保网站服务器已启动：")
        print("  - 开发模式: npm run dev")
        print("  - 预览模式: npm run preview")
        print()
        print("如果服务器运行在其他端口，请使用 --base-url 参数指定")
        print("例如: python fetch_icons_via_api.py --base-url http://localhost:3000")
        sys.exit(1)
    
    print(f"✓ 服务器运行正常")
    print()
    
    if args.dry_run:
        print("【干运行模式】只检查不修改")
    print(f"【并行模式】使用 {args.workers} 个工作线程")
    if args.verbose:
        print("【详细模式】显示详细输出")
    print()

    total_stats = {'total': 0, 'success': 0, 'failed': 0, 'skipped': 0}

    # 遍历所有 JSON 文件
    json_files = sorted(groups_dir.glob('*.json'))

    for json_file in json_files:
        stats = process_file(
            json_file,
            base_url=args.base_url,
            workers=args.workers,
            dry_run=args.dry_run,
            verbose=args.verbose
        )
        for key in total_stats:
            total_stats[key] += stats.get(key, 0)

    # 打印统计
    print("\n" + "=" * 60)
    print("处理完成!")
    print("=" * 60)
    print(f"总资源数: {total_stats['total']}")
    if not args.dry_run:
        print(f"成功获取: {total_stats['success']}")
        print(f"获取失败: {total_stats['failed']}")
        print(f"跳过: {total_stats['skipped']}")


if __name__ == "__main__":
    main()
