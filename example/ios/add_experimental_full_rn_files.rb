#!/usr/bin/env ruby
# One-off script for the full-RN experiment ONLY — adds FullRNKeyboardBootstrap.swift (source)
# and main.jsbundle (resource) to the CustomKeyboardExtension target. Not part of the
# generalized setup_xcode_targets.rb (this is app-owned experimental code, not shipped in the
# npm package). Delete this script once the experiment concludes one way or the other.

require 'xcodeproj'

PROJECT_PATH = 'CustomKeyboardExample.xcodeproj'
proj = Xcodeproj::Project.open(PROJECT_PATH)

ext_target = proj.targets.find { |t| t.name == 'CustomKeyboardExtension' }
raise 'CustomKeyboardExtension target not found' unless ext_target

app_group = proj.main_group.find_subpath('CustomKeyboardExtensionApp', false)
raise 'CustomKeyboardExtensionApp group not found' unless app_group

# Remove stale references from a previous run of this script, if any.
%w[FullRNKeyboardBootstrap.swift main.jsbundle].each do |name|
  existing = app_group.files.find { |f| f.path == name }
  next unless existing

  ext_target.source_build_phase.files.select { |f| f.file_ref == existing }.each(&:remove_from_project)
  ext_target.resources_build_phase.files.select { |f| f.file_ref == existing }.each(&:remove_from_project)
  existing.remove_from_project
end

swift_ref = app_group.new_reference('FullRNKeyboardBootstrap.swift')
ext_target.source_build_phase.add_file_reference(swift_ref)

bundle_ref = app_group.new_reference('main.jsbundle')
ext_target.resources_build_phase.add_file_reference(bundle_ref)

proj.save
puts 'Added FullRNKeyboardBootstrap.swift + main.jsbundle to CustomKeyboardExtension target'
