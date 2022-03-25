
agent_version=$(git describe)

echo "### BUILDING AGENT ${agent_version}"
echo "adding agent version to the sources"

root="${PWD}"

cat <<VERSION_FILE > ${root}/core/constants/version.js
exports.version = "${agent_version}"
VERSION_FILE
