---
layout: default
title: Categorías
permalink: /categorias/
---
<div class="wrap page">
  <h1>Categorías</h1>

  {% assign grouped = site.posts | group_by: "category" %}
  {% for group in grouped %}
    {% unless group.name == "misc" %}
    <h2 style="font-family: var(--font-mono); font-size: 16px; margin-top: 36px;">
      <span class="tag tag-{{ group.name }}">{{ group.items.first.category_label | default: group.name }}</span>
      <span style="color: var(--text-faint); font-weight: 400; margin-left: 8px;">({{ group.items.size }})</span>
    </h2>
    <div class="case-list" style="padding-top: 0;">
      {% for post in group.items %}
      <article class="case-entry">
        <div class="case-ref">#{{ post.ref | default: "0000-000" }}</div>
        <div class="case-main">
          <h3><a href="{{ post.url | relative_url }}">{{ post.title }}</a></h3>
          <div class="case-meta">
            <span class="case-date">{{ post.date | date: "%d %b %Y" }}</span>
            <span class="difficulty">
              {% assign diff = post.difficulty | default: 1 %}
              {% for i in (1..5) %}
                <span class="{% if i <= diff %}on{% endif %}"></span>
              {% endfor %}
            </span>
          </div>
        </div>
      </article>
      {% endfor %}
    </div>
    {% endunless %}
  {% endfor %}
</div>
