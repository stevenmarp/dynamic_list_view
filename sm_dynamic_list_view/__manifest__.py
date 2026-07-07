# -*- coding: utf-8 -*-
{
    "name": "Dynamic List View",
    "summary": "Drag and drop to reorder list view columns",
    "description": """
        Allows users to drag and drop columns in list views to reorder them.
        Column order is saved per model in browser localStorage.
    """,
    "version": "16.0.1.0.0",
    "author": "Steven Marp",
    "website": "https://apps.odoo.com/apps/browse?repo_maintainer_id=512936",
    "category": "Tools",
    "license": "OPL-1",
    "depends": ["web"],
    "assets": {
        "web.assets_backend": [
            "sm_dynamic_list_view/static/src/js/list_renderer.js",
            "sm_dynamic_list_view/static/src/scss/style.scss",
        ],
    },
    "images": ["static/description/banner.gif"],
    "installable": True,
    "application": False,
    "auto_install": False,
    "price": 17.86,
    "currency": "USD",
}
