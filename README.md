# Dunier – fantasy map generator

Dunier is a tool being designed to help world builders build more and more realistic
worlds. Sometimes you need a world, but don't want to painstakingly build every
aspect of it yourself. Maybe you're running an RPG campaign and just need a
believable setting for your plot. Maybe you're a world builder who's more interested
in culture and magic than in locations and names. Then Dunier is the tool for
you.

Not just a map generator, Dunier also gives you an info sheet on each country,
a list of names in each language, and a 3&thinsp;000 year history of conquest,
division, and advancement across the world.

Dunier is inspired by previous fantasy map generators like
[Azgaar's one](https://azgaar.github.io/Fantasy-Map-Generator), but has more of an emphasis
on realism. It is not as interactive as some generators, and it does not generate as
many fine details like mine locations and diplomatic relations. It does, however,
account for several features missing in other generators that are noticeable on the
macroscopic scale, such as planetary curvature, plate tectonics, and linguistic
drift.

## Compiling the code

This repository contains static HTML files that load in compiled TypeScript files.
If you want to host your own fork of it, you'll need to compile the TypeScript.
You can install the TypeScript compiler with Node; I still don't really understand how Node works,
but I think all the information you need regarding Node dependencies is in `package.json`.
Once you have that, you should be able to just go to the root directory and call
~~~bash
tsc
~~~

If you want to run the tests, you'll need Jest, which can also be installed with Node.
Once you've got that done, you should be able to just call
~~~bash
jest
~~~

The HTML files are all autogenerated from the templates in `res/templates/` and the translation files in `res/tarje/`.
If you edit either of those, you can update the HTML by installing Python 3 and calling
~~~bash
python src/python/build_html.py
~~~

## Credits

This project drew heavy inspiration from
[Azgaar's similar fantasy map generator](https://azgaar.github.io/fantasy-map-generator/). The slick aesthetic comes courtesy of
[the Bootstrap library](https://getbootstrap.com/) and
[HatScripts' circular flag collection](https://github.com/HatScripts/circle-flags).
