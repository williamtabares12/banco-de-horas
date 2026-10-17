/** La versión de la app (de package.json) y el día en que se compiló. */
export function versionDeLaApp(): { version: string; compilado: string } {
  return { version: __VERSION_APP__, compilado: __COMPILADO__ };
}
