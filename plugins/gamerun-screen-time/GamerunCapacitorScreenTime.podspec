require 'json'
package = JSON.parse(File.read(File.join(__dir__, 'package.json')))
Pod::Spec.new do |s|
  s.name = 'GamerunCapacitorScreenTime'
  s.version = package['version']
  s.summary = package['description']
  s.license = package['license']
  s.homepage = 'https://second-life-project-archive.lovable.app'
  s.author = 'GameRun'
  s.source = { :git => 'https://github.com/ionic-team/capacitor.git', :tag => '8.0.0' }
  s.source_files = 'ios/Sources/**/*.{swift,h,m}'
  s.ios.deployment_target = '16.0'
  s.dependency 'Capacitor'
  s.swift_version = '5.9'
  s.frameworks = 'FamilyControls', 'ManagedSettings', 'DeviceActivity'
end