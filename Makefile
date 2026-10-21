# 常用命令都收在这里
VENV   := .venv
PYTHON := $(VENV)/bin/python
MKDOCS := $(VENV)/bin/mkdocs

.DEFAULT_GOAL := help

.PHONY: help install serve build clean new

help:  ## 显示这份帮助
	@echo "用法：make <目标>"
	@echo ""
	@echo "  make install   创建 .venv 并安装依赖"
	@echo "  make serve     本地预览（带热重载）"
	@echo "  make build     构建到 site/（strict 模式）"
	@echo "  make new TITLE=\"标题\" PATH=python/basics SLUG=slug   新建文章"
	@echo "  make clean     删除构建产物"

install:
	python3 -m venv $(VENV)
	$(PYTHON) -m pip install --upgrade pip
	$(PYTHON) -m pip install -r requirements.txt

serve:
	$(MKDOCS) serve

build:
	$(MKDOCS) build --strict

clean:
	rm -rf site

new:
	@test -n "$(TITLE)" || (echo '用法：make new TITLE="标题" PATH=python/basics SLUG=slug' && exit 1)
	@test -n "$(PATH)" || (echo '请用 PATH=... 指定模块目录，如 python/basics' && exit 1)
	@test -n "$(SLUG)" || (echo '请用 SLUG=... 指定文件名（英文）' && exit 1)
	$(PYTHON) scripts/new_page.py "$(TITLE)" --path "$(PATH)" --slug "$(SLUG)"
