#!/usr/bin/env ruby
# Creates (or refreshes) the CustomKeyboardExtension (app extension) target in a React Native
# app's Xcode project, wired to this package's Swift sources, plus KeyboardSettingsModule (see
# docs/adr/ADR-005/api.md) onto the app target itself. This is the one manual step iOS can't
# avoid — Apple requires a distinct App Extension target for a custom keyboard, which no
# CocoaPod/npm install can fabricate on its own (see docs/adr/ADR-006).
#
# Idempotent by recreation, not by skipping: every run removes whichever of these targets/groups/
# file references already exist, then rebuilds them from the current file lists below. This is
# more reliable than trying to patch an existing target's file list in place as those lists
# change over time — Xcode project metadata is cheap to regenerate, unlike the source it points
# to.
#
# Usage: npx react-native-custom-keyboard setup-ios [iosDir]
#   (or directly: ruby setup_xcode_targets.rb [iosDir] — iosDir defaults to ./ios)
#
# Requires the `xcodeproj` gem. If it's not on your default Ruby load path, install it with
# `gem install xcodeproj` or point GEM_PATH at a Ruby environment that has it (e.g. the one
# bundled with a local CocoaPods install).

require 'xcodeproj'
require 'pathname'

ios_dir = Pathname.new(File.expand_path(ARGV[0] || 'ios'))
raise "No such directory: #{ios_dir}" unless ios_dir.directory?

project_paths = Dir.glob(ios_dir.join('*.xcodeproj').to_s)
raise "No .xcodeproj found in #{ios_dir}" if project_paths.empty?
raise "Multiple .xcodeproj found in #{ios_dir} — pass a more specific iosDir: #{project_paths.join(', ')}" if project_paths.size > 1

project_path = project_paths.first
proj = Xcodeproj::Project.open(project_path)

app_target = proj.targets.find { |t| t.product_type == 'com.apple.product-type.application' }
raise "No application target found in #{project_path}" unless app_target

app_bundle_id =
  app_target.build_configurations.first&.build_settings&.[]('PRODUCT_BUNDLE_IDENTIFIER') ||
  raise("Could not read #{app_target.name}'s PRODUCT_BUNDLE_IDENTIFIER")

def common_settings(config, deployment_target: '15.1')
  config.build_settings['PRODUCT_NAME'] = '$(TARGET_NAME)'
  config.build_settings['SWIFT_VERSION'] = '5.0'
  config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = deployment_target
  config.build_settings['CODE_SIGN_STYLE'] = 'Automatic'
  config.build_settings['TARGETED_DEVICE_FAMILY'] = '1,2'
end

# -- Tear down whatever a previous run of this script created -----------------------------------

ext_name = 'CustomKeyboardExtension'
%W[#{ext_name} #{ext_name}Tests].each do |name|
  target = proj.targets.find { |t| t.name == name }
  next unless target

  embed_phase = app_target.copy_files_build_phases.find { |p| p.symbol_dst_subfolder_spec == :plug_ins }
  embed_phase&.files&.select { |f| f.file_ref == target.product_reference }&.each(&:remove_from_project)
  app_target.dependencies.select { |d| d.target == target }.each(&:remove_from_project)
  target.remove_from_project
  puts "Removed existing target #{name}"
end

%W[#{ext_name} #{ext_name}Tests].each do |name|
  group = proj.main_group.find_subpath(name, false)
  group&.remove_from_project
end
proj.main_group.files.select { |f| f.path == "#{ext_name}/Info.plist" }.each(&:remove_from_project)

# The app target's own KeyboardSettingsModule file references live in the same shared-source
# group removed above, so its build-phase entries need clearing too, before re-adding them from a
# freshly created group below.
app_target.source_build_phase.files
  .select { |f| f.file_ref&.path.to_s.end_with?('KeyboardSettingsModule.swift', 'KeyboardSettingsModule.m') }
  .each(&:remove_from_project)

# -- App-owned extension folder (branding + generated compiled JS, not shared library code) -----
# Scaffolded on first run if missing, so `setup-ios` alone is enough to get a working extension;
# edit CFBundleDisplayName afterwards to brand your own keyboard.

app_ext_dir = ios_dir.join(ext_name)
app_ext_dir.mkpath
info_plist_path = app_ext_dir.join('Info.plist')
unless info_plist_path.exist?
  File.write(info_plist_path, <<~PLIST)
    <?xml version="1.0" encoding="UTF-8"?>
    <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
    <plist version="1.0">
    <dict>
    \t<key>CFBundleDevelopmentRegion</key>
    \t<string>en</string>
    \t<key>CFBundleDisplayName</key>
    \t<string>My Custom Keyboard</string>
    \t<key>CFBundleExecutable</key>
    \t<string>$(EXECUTABLE_NAME)</string>
    \t<key>CFBundleIdentifier</key>
    \t<string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>
    \t<key>CFBundleInfoDictionaryVersion</key>
    \t<string>6.0</string>
    \t<key>CFBundleName</key>
    \t<string>$(PRODUCT_NAME)</string>
    \t<key>CFBundlePackageType</key>
    \t<string>XPC!</string>
    \t<key>CFBundleShortVersionString</key>
    \t<string>$(MARKETING_VERSION)</string>
    \t<key>CFBundleVersion</key>
    \t<string>$(CURRENT_PROJECT_VERSION)</string>
    \t<key>NSExtension</key>
    \t<dict>
    \t\t<key>NSExtensionAttributes</key>
    \t\t<dict>
    \t\t\t<key>IsASCIICapable</key>
    \t\t\t<false/>
    \t\t\t<key>PrefersRightToLeft</key>
    \t\t\t<false/>
    \t\t\t<key>PrimaryLanguage</key>
    \t\t\t<string>en-US</string>
    \t\t\t<key>RequestsOpenAccess</key>
    \t\t\t<false/>
    \t\t</dict>
    \t\t<key>NSExtensionPointIdentifier</key>
    \t\t<string>com.apple.keyboard-service</string>
    \t\t<key>NSExtensionPrincipalClass</key>
    \t\t<string>$(PRODUCT_MODULE_NAME).KeyboardViewController</string>
    \t</dict>
    </dict>
    </plist>
  PLIST
  puts "Scaffolded #{info_plist_path} — edit CFBundleDisplayName to brand your own keyboard."
end
compiled_bundle_path = app_ext_dir.join('KeyboardApp.compiled.js')
unless compiled_bundle_path.exist?
  File.write(compiled_bundle_path, "// Placeholder — run `npx react-native-custom-keyboard build-keyboard <entry> #{compiled_bundle_path}`\n")
  puts "Scaffolded a placeholder #{compiled_bundle_path} — replace it by running build-keyboard."
end

# -- Rebuild --------------------------------------------------------------------------------

# This package's own Swift/JS sources (installed under node_modules) are referenced, not copied,
# so there is a single source of truth. lib_dir is computed relative to the .xcodeproj's own
# directory so this works regardless of where the consumer's project lives relative to
# node_modules.
lib_dir = Pathname.new(__dir__)
project_dir = Pathname.new(File.dirname(project_path))
relative_lib_dir = lib_dir.relative_path_from(project_dir).to_s
lib_group = proj.main_group.new_group(ext_name, relative_lib_dir)

ext_target = proj.new_target(:app_extension, ext_name, :ios, '15.1')

source_files = %w[
  JSKeyboardRuntime.swift
  DynamicViewRenderer.swift
  TouchableOpacityButton.swift
  KeyboardViewController.swift
  UIColor+Hex.swift
].map { |rel| lib_group.new_reference(rel) }
source_files.each { |ref| ext_target.source_build_phase.add_file_reference(ref) }

prelude_ref = lib_group.new_reference('Resources/mini-react-runtime.js')
ext_target.resources_build_phase.add_file_reference(prelude_ref)

app_group = proj.main_group.new_group("#{ext_name}App", ext_name)
info_plist_ref = app_group.new_reference('Info.plist')
compiled_bundle_ref = app_group.new_reference('KeyboardApp.compiled.js')
ext_target.resources_build_phase.add_file_reference(compiled_bundle_ref)

ext_target.build_configurations.each do |config|
  common_settings(config)
  config.build_settings['PRODUCT_BUNDLE_IDENTIFIER'] = "#{app_bundle_id}.#{ext_name}"
  config.build_settings['INFOPLIST_FILE'] = "#{ext_name}/Info.plist"
  config.build_settings['SKIP_INSTALL'] = 'NO'
  config.build_settings['GENERATE_INFOPLIST_FILE'] = 'NO'
  config.build_settings['MARKETING_VERSION'] = '1.0'
  config.build_settings['CURRENT_PROJECT_VERSION'] = '1'
end
_ = info_plist_ref # referenced via the group; kept for clarity that it's part of the app group

# Embed the extension into the host app (PlugIns) and add a target dependency so building the
# app also builds the extension.
app_target.add_dependency(ext_target)
embed_phase = app_target.copy_files_build_phases.find { |p| p.symbol_dst_subfolder_spec == :plug_ins }
embed_phase ||= app_target.new_copy_files_build_phase('Embed App Extensions')
embed_phase.symbol_dst_subfolder_spec = :plug_ins
embed_build_file = embed_phase.add_file_reference(ext_target.product_reference)
embed_build_file.settings = { 'ATTRIBUTES' => ['RemoveHeadersOnCopy'] }

puts "Created target #{ext_name} (bundle id #{app_bundle_id}.#{ext_name})"

# KeyboardSettingsModule runs in the host app's own process (not the extension's) — see its own
# doc comment — so it's added to app_target, not ext_target, from the same shared source group.
%w[KeyboardSettingsModule.swift KeyboardSettingsModule.m].each do |rel|
  ref = lib_group.new_reference(rel)
  app_target.source_build_phase.add_file_reference(ref)
end
puts "Added KeyboardSettingsModule to #{app_target.name} app target"

proj.save
puts 'Saved project'
