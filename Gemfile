source "https://rubygems.org"

# Ruby 4.0 removed taint/untaint — patch early so Liquid 4.x doesn't crash
class Object
  def tainted?; false; end unless method_defined?(:tainted?)
  def taint; self; end unless method_defined?(:taint)
  def untaint; self; end unless method_defined?(:untaint)
end

gem "jekyll", "~> 4.3"
gem "csv"
gem "bigdecimal"

group :jekyll_plugins do
  gem "jekyll-feed"
  gem "jekyll-seo-tag"
  gem "jekyll-sitemap"
end

platforms :mingw, :x64_mingw, :mswin, :jruby do
  gem "tzinfo", ">= 1", "< 3"
  gem "tzinfo-data"
end

gem "wdm", ">= 0.1.0", platforms: [:mingw, :x64_mingw, :mswin] if Gem.win_platform?
