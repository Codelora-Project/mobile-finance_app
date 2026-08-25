const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

// 1. Gesture Handler
try {
  const ghDir = path.join(
    rootDir,
    'node_modules',
    'react-native-gesture-handler',
  );
  if (fs.existsSync(ghDir)) {
    const srcShadow = path.join(ghDir, 'shared', 'shadowNodes');
    const destShadow = path.join(ghDir, 'android', 'shadowNodes');
    if (fs.existsSync(srcShadow)) {
      fs.cpSync(srcShadow, destShadow, { recursive: true, force: true });
    }
    const cmakePath = path.join(ghDir, 'android', 'CMakeLists.txt');
    if (fs.existsSync(cmakePath)) {
      let cmake = fs.readFileSync(cmakePath, 'utf8');
      if (cmake.includes('../shared/shadowNodes')) {
        cmake = cmake.replace(/\.\.\/shared\/shadowNodes/g, './shadowNodes');
        fs.writeFileSync(cmakePath, cmake, 'utf8');
      }
    }
    const srcRuntime = path.join(ghDir, 'shared', 'runtime');
    const destRuntime = path.join(
      ghDir,
      'android',
      'src',
      'main',
      'jni',
      'runtime',
    );
    if (fs.existsSync(srcRuntime)) {
      fs.cpSync(srcRuntime, destRuntime, { recursive: true, force: true });
    }
    const jniCmakePath = path.join(
      ghDir,
      'android',
      'src',
      'main',
      'jni',
      'CMakeLists.txt',
    );
    if (fs.existsSync(jniCmakePath)) {
      let jniCmake = fs.readFileSync(jniCmakePath, 'utf8');
      if (jniCmake.includes('"${RNGH_DIR}/shared/runtime/*.cpp"')) {
        jniCmake = jniCmake.replace(
          '"${RNGH_DIR}/shared/runtime/*.cpp"',
          './runtime/*.cpp',
        );
        jniCmake = jniCmake.replace(
          '"${RNGH_DIR}/shared/runtime"',
          '"${CMAKE_SOURCE_DIR}/runtime"',
        );
        fs.writeFileSync(jniCmakePath, jniCmake, 'utf8');
      }
    }
  }
} catch (err) {
  console.warn('[fix] gesture handler:', err.message);
}

// 2. Safe Area Context
try {
  const sacDir = path.join(
    rootDir,
    'node_modules',
    'react-native-safe-area-context',
  );
  if (fs.existsSync(sacDir)) {
    const srcCommon = path.join(
      sacDir,
      'common',
      'cpp',
      'react',
      'renderer',
      'components',
      'safeareacontext',
    );
    const destCommon = path.join(
      sacDir,
      'android',
      'src',
      'main',
      'jni',
      'safeareacontext',
    );
    if (fs.existsSync(srcCommon)) {
      fs.cpSync(srcCommon, destCommon, { recursive: true, force: true });
    }

    const srcCodegen = path.join(
      sacDir,
      'android',
      'build',
      'generated',
      'source',
      'codegen',
      'jni',
    );
    const destCodegen = path.join(
      sacDir,
      'android',
      'src',
      'main',
      'jni',
      'safeareacontext_codegen',
    );
    if (fs.existsSync(srcCodegen)) {
      fs.cpSync(srcCodegen, destCodegen, { recursive: true, force: true });
    }

    const cmakePath = path.join(
      sacDir,
      'android',
      'src',
      'main',
      'jni',
      'CMakeLists.txt',
    );
    if (fs.existsSync(cmakePath)) {
      let cmake = fs.readFileSync(cmakePath, 'utf8');
      cmake = cmake.replace(
        '${LIB_COMMON_DIR}/react/renderer/components/${LIB_LITERAL}/*.cpp',
        './safeareacontext/*.cpp',
      );
      cmake = cmake.replace(
        '${LIB_ANDROID_GENERATED_JNI_DIR}/*.cpp ${LIB_ANDROID_GENERATED_COMPONENTS_DIR}/*.cpp',
        './safeareacontext_codegen/*.cpp ./safeareacontext_codegen/react/renderer/components/safeareacontext/*.cpp',
      );
      fs.writeFileSync(cmakePath, cmake, 'utf8');
      console.log('[fix] safe area context patched successfully.');
    }
  }
} catch (err) {
  console.warn('[fix] safe area context:', err.message);
}

// 3. React Native Screens
try {
  const rnsDir = path.join(rootDir, 'node_modules', 'react-native-screens');
  if (fs.existsSync(rnsDir)) {
    const srcCommon = path.join(
      rnsDir,
      'common',
      'cpp',
      'react',
      'renderer',
      'components',
      'rnscreens',
    );
    const destCommon = path.join(
      rnsDir,
      'android',
      'src',
      'main',
      'jni',
      'rnscreens',
    );
    if (fs.existsSync(srcCommon)) {
      fs.cpSync(srcCommon, destCommon, { recursive: true, force: true });
    }

    const srcCodegen = path.join(
      rnsDir,
      'android',
      'build',
      'generated',
      'source',
      'codegen',
      'jni',
      'react',
      'renderer',
      'components',
      'rnscreens',
    );
    const destCodegen = path.join(
      rnsDir,
      'android',
      'src',
      'main',
      'jni',
      'rnscreens_codegen',
    );
    if (fs.existsSync(destCodegen)) {
      fs.rmSync(destCodegen, { recursive: true, force: true });
    }
    if (fs.existsSync(srcCodegen)) {
      fs.cpSync(srcCodegen, destCodegen, { recursive: true, force: true });
    }

    const cmakePath = path.join(
      rnsDir,
      'android',
      'src',
      'main',
      'jni',
      'CMakeLists.txt',
    );
    if (fs.existsSync(cmakePath)) {
      let cmake = fs.readFileSync(cmakePath, 'utf8');
      cmake = cmake.replace(
        '${LIB_COMMON_COMPONENTS_DIR}/*.cpp ${LIB_COMMON_COMPONENTS_DIR}/utils/*.cpp',
        './rnscreens/*.cpp ./rnscreens/utils/*.cpp',
      );
      cmake = cmake.replace(
        '${LIB_ANDROID_GENERATED_COMPONENTS_DIR}/*.cpp',
        './rnscreens_codegen/*.cpp',
      );
      fs.writeFileSync(cmakePath, cmake, 'utf8');
      console.log('[fix] react native screens patched successfully.');
    }
  }
} catch (err) {
  console.warn('[fix] react-native-screens:', err.message);
}
